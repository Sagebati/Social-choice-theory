//! The JSON API: one function per endpoint, JSON in and out, nothing about
//! the transport. The browser calls it through WebAssembly (see `lib.rs`).
//!
//! Every endpoint takes a [`Lang`] and answers in that language: explanations,
//! descriptions and error messages alike.

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use social_choice::arrow::{check_arrow, ArrowReport, Rule, MAX_ARROW_VOTERS};
use social_choice::criteria::{find_counterexample_in, satisfies, Counterexample};
use social_choice::manipulation::{
    find_manipulations_in, find_spoilers, manipulability, Manipulability, Manipulation, Spoiler,
};
use social_choice::pairwise::PairwiseSummary;
use social_choice::random::{random_election, Rng};
use social_choice::spatial::{yee, Point, SpatialModel, SpatialVote};
use social_choice::{catalog, scenarios, Criterion, Election, Lang, Method, Outcome, PairwiseMatrix};
use std::fmt;

/// Upper bounds that keep every call quick enough to feel live, even on a phone.
const MAX_BALLOTS: usize = 2_000;
const MAX_VOTERS: usize = 3_000;
const MAX_MANIPULATION_BALLOTS: usize = 40;
const MAX_YEE_RESOLUTION: usize = 64;
const MAX_YEE_CROWD: u32 = 200;
const MAX_SAMPLES: usize = 500;
const MAX_ATTEMPTS: usize = 40_000;

/// Runs `endpoint` (`elect`, `yee`…) on a JSON `body` and returns the JSON
/// answer. The catalogue endpoints (`health`, `methods`, `criteria`,
/// `scenarios`) ignore the body.
///
/// French answers get French typography (no-break spaces before `: ; ! ?` and
/// inside « ») in every string.
pub fn handle(endpoint: &str, lang: Lang, body: &str) -> Result<String, ApiError> {
    match endpoint.trim_start_matches('/') {
        "health" => answer(lang, Health { ok: true, version: env!("CARGO_PKG_VERSION") }),
        "methods" => answer(lang, catalog::all_in(lang)),
        "criteria" => answer(lang, catalog::criteria_in(lang)),
        "scenarios" => answer(lang, scenarios::all_in(lang)),
        "elect" => answer(lang, elect(lang, parse(body, lang)?)?),
        "spatial" => answer(lang, spatial(lang, parse(body, lang)?)?),
        "yee" => answer(lang, yee_diagram(lang, parse(body, lang)?)?),
        "manipulate" => answer(lang, manipulate(lang, parse(body, lang)?)?),
        "manipulability" => answer(lang, manipulability_report(lang, parse(body, lang)?)?),
        "counterexample" => answer(lang, counterexample(lang, parse(body, lang)?)),
        "arrow" => answer(lang, arrow(lang, parse(body, lang)?)?),
        "random" => answer(lang, random(lang, parse(body, lang)?)?),
        _ => Err(ApiError::new(lang, lang.pick("no such endpoint", "aucun point d’accès à cette adresse"))),
    }
}

fn answer<T: Serialize>(lang: Lang, body: T) -> Result<String, ApiError> {
    let json = if lang == Lang::En {
        serde_json::to_string(&body)
    } else {
        serde_json::to_value(&body).and_then(|mut value| {
            typeset(&mut value, lang);
            serde_json::to_string(&value)
        })
    };
    json.map_err(|error| ApiError::new(lang, error.to_string()))
}

fn typeset(value: &mut Value, lang: Lang) {
    match value {
        Value::String(text) => *text = lang.typeset(text),
        Value::Array(items) => items.iter_mut().for_each(|v| typeset(v, lang)),
        Value::Object(fields) => fields.values_mut().for_each(|v| typeset(v, lang)),
        _ => {}
    }
}

/// Reads a request body. The message names the offending field
/// (`election.ballots[0].ranking: …`), in the client's language.
fn parse<T: DeserializeOwned>(body: &str, lang: Lang) -> Result<T, ApiError> {
    let mut json = serde_json::Deserializer::from_str(body);
    let parsed = serde_path_to_error::deserialize(&mut json)
        .map_err(|e| (e.inner().is_data(), e.to_string()))
        .and_then(|value| json.end().map(|()| value).map_err(|e| (false, e.to_string())));
    parsed.map_err(|(data, error)| {
        let message = match (lang, data) {
            (Lang::En, false) => format!("Failed to parse the request body as JSON: {error}"),
            (Lang::En, true) => format!("Failed to deserialize the JSON body into the target type: {error}"),
            (Lang::Fr, false) => format!("le corps de la requête n’est pas du JSON valide : {error}"),
            (Lang::Fr, true) => format!("le JSON reçu ne correspond pas au format attendu : {error}"),
        };
        ApiError::new(lang, message)
    })
}

/// A request the API refused, with the reason in the client's language.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApiError {
    message: String,
}

impl ApiError {
    fn new(lang: Lang, message: impl AsRef<str>) -> Self {
        ApiError { message: lang.typeset(message.as_ref()) }
    }

    fn election(lang: Lang, error: social_choice::Error) -> Self {
        ApiError::new(lang, error.message_in(lang))
    }

    pub fn message(&self) -> &str {
        &self.message
    }
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for ApiError {}

type ApiResult<T> = Result<T, ApiError>;

fn all_methods() -> Vec<Method> {
    Method::ALL.to_vec()
}

fn checked(election: Election, lang: Lang) -> Result<Election, ApiError> {
    if election.ballots.len() > MAX_BALLOTS {
        let message =
            lang.pick(format!("at most {MAX_BALLOTS} ballots"), format!("{MAX_BALLOTS} bulletins au maximum"));
        return Err(ApiError::new(lang, message));
    }
    election.complete().map_err(|e| ApiError::election(lang, e))
}

fn checked_model(model: &SpatialModel, lang: Lang) -> Result<(), ApiError> {
    let finite = |x: f64| x.is_finite() && x.abs() <= 10.0;
    let candidates_ok = model.candidates.iter().all(|c| finite(c.x) && finite(c.y));
    let voters_ok = model.voters.iter().all(|p| finite(p.x) && finite(p.y))
        && model.crowds.iter().all(|c| finite(c.x) && finite(c.y) && finite(c.spread) && c.spread >= 0.0);
    if !candidates_ok || !voters_ok {
        return Err(ApiError::new(
            lang,
            lang.pick(
                "coordinates must be finite numbers between -10 and 10",
                "les coordonnées doivent être des nombres finis compris entre -10 et 10",
            ),
        ));
    }
    let voters = model.voters.len() as u64 + model.crowds.iter().map(|c| u64::from(c.count)).sum::<u64>();
    if voters > MAX_VOTERS as u64 {
        let message = lang.pick(format!("at most {MAX_VOTERS} voters"), format!("{MAX_VOTERS} électeurs au maximum"));
        return Err(ApiError::new(lang, message));
    }
    if !(0.0..=1.0).contains(&model.strategic) {
        return Err(ApiError::new(
            lang,
            lang.pick("strategic must be between 0 and 1", "strategic doit aller de 0 à 1"),
        ));
    }
    if model.approval_radius.is_some_and(|r| !r.is_finite() || r < 0.0) {
        return Err(ApiError::new(
            lang,
            lang.pick(
                "approval_radius must be a non-negative number",
                "approval_radius doit être un nombre positif ou nul",
            ),
        ));
    }
    // Reuse the election checks for the candidate list and score scale.
    let mut probe = Election::new(model.candidates.iter().map(|c| c.name.clone()));
    probe.max_score = model.max_score;
    probe.complete().map_err(|e| ApiError::election(lang, e))?;
    Ok(())
}

#[derive(Serialize)]
struct Health {
    ok: bool,
    version: &'static str,
}

#[derive(Deserialize)]
struct ElectRequest {
    election: Election,
    #[serde(default = "all_methods")]
    methods: Vec<Method>,
}

#[derive(Serialize)]
struct MethodResult {
    outcome: Outcome,
    spoilers: Vec<Spoiler>,
}

#[derive(Serialize)]
struct ElectResponse {
    election: Election,
    pairwise: PairwiseSummary,
    results: Vec<MethodResult>,
}

fn elect(lang: Lang, req: ElectRequest) -> ApiResult<ElectResponse> {
    let election = checked(req.election, lang)?;
    let results = req
        .methods
        .iter()
        .map(|&m| MethodResult { outcome: m.run_in(&election, lang), spoilers: find_spoilers(&election, m) })
        .collect();
    Ok(ElectResponse { pairwise: PairwiseMatrix::new(&election).summary(), results, election })
}

#[derive(Deserialize)]
struct SpatialRequest {
    model: SpatialModel,
    #[serde(default = "all_methods")]
    methods: Vec<Method>,
}

#[derive(Serialize)]
struct SpatialMethodResult {
    method: Method,
    outcome: Outcome,
    frontrunners: Vec<usize>,
    votes: Vec<SpatialVote>,
    spoilers: Vec<Spoiler>,
    election: Election,
}

#[derive(Serialize)]
struct SpatialResponse {
    voters: Vec<Point>,
    /// Everyone's honest ballots, identical ones merged.
    honest: Election,
    /// Head-to-head results of the honest ballots.
    pairwise: PairwiseSummary,
    results: Vec<SpatialMethodResult>,
}

fn spatial(lang: Lang, req: SpatialRequest) -> ApiResult<SpatialResponse> {
    checked_model(&req.model, lang)?;
    let honest = req.model.honest_election().compress();
    let results = req
        .methods
        .iter()
        .map(|&m| {
            let r = req.model.run_in(m, lang);
            SpatialMethodResult {
                spoilers: find_spoilers(&r.election, m),
                method: m,
                outcome: r.outcome,
                frontrunners: r.frontrunners,
                votes: r.votes,
                election: r.election,
            }
        })
        .collect();
    Ok(SpatialResponse {
        voters: req.model.voter_points(),
        pairwise: PairwiseMatrix::new(&honest).summary(),
        honest,
        results,
    })
}

fn default_resolution() -> usize {
    32
}

fn default_spread() -> f64 {
    0.12
}

fn default_count() -> u32 {
    40
}

#[derive(Deserialize)]
struct YeeRequest {
    model: SpatialModel,
    method: Method,
    #[serde(default = "default_resolution")]
    resolution: usize,
    #[serde(default = "default_spread")]
    spread: f64,
    #[serde(default = "default_count")]
    count: u32,
}

#[derive(Serialize)]
struct YeeResponse {
    method: Method,
    resolution: usize,
    /// Winner of each cell, row by row from the top-left.
    cells: Vec<usize>,
}

fn yee_diagram(lang: Lang, req: YeeRequest) -> ApiResult<YeeResponse> {
    checked_model(&req.model, lang)?;
    if !(1..=MAX_YEE_RESOLUTION).contains(&req.resolution) {
        let message = lang.pick(
            format!("resolution must be between 1 and {MAX_YEE_RESOLUTION}"),
            format!("resolution doit aller de 1 à {MAX_YEE_RESOLUTION}"),
        );
        return Err(ApiError::new(lang, message));
    }
    if !(1..=MAX_YEE_CROWD).contains(&req.count) || !(0.0..=1.0).contains(&req.spread) {
        let message = lang.pick(
            format!("count must be 1 to {MAX_YEE_CROWD} and spread 0 to 1"),
            format!("count doit aller de 1 à {MAX_YEE_CROWD} et spread de 0 à 1"),
        );
        return Err(ApiError::new(lang, message));
    }
    let cells = yee(&req.model, req.method, req.resolution, req.spread, req.count);
    Ok(YeeResponse { method: req.method, resolution: req.resolution, cells })
}

fn default_limit() -> usize {
    8
}

#[derive(Deserialize)]
struct ManipulateRequest {
    election: Election,
    method: Method,
    #[serde(default = "default_limit")]
    limit: usize,
}

#[derive(Serialize)]
struct ManipulateResponse {
    honest: Outcome,
    manipulations: Vec<Manipulation>,
    spoilers: Vec<Spoiler>,
}

fn manipulate(lang: Lang, req: ManipulateRequest) -> ApiResult<ManipulateResponse> {
    let election = checked(req.election, lang)?.compress();
    if election.ballots.len() > MAX_MANIPULATION_BALLOTS {
        let message = lang.pick(
            format!("at most {MAX_MANIPULATION_BALLOTS} distinct ballots for a manipulation search"),
            format!("{MAX_MANIPULATION_BALLOTS} bulletins différents au maximum pour une recherche de manipulation"),
        );
        return Err(ApiError::new(lang, message));
    }
    Ok(ManipulateResponse {
        honest: req.method.run_in(&election, lang),
        manipulations: find_manipulations_in(&election, req.method, req.limit.min(50), lang),
        spoilers: find_spoilers(&election, req.method),
    })
}

fn default_candidates() -> usize {
    3
}

fn default_samples() -> usize {
    150
}

fn default_seed() -> u64 {
    2024
}

#[derive(Deserialize)]
struct ManipulabilityRequest {
    #[serde(default = "all_methods")]
    methods: Vec<Method>,
    #[serde(default = "default_candidates")]
    candidates: usize,
    #[serde(default = "default_samples")]
    samples: usize,
    #[serde(default = "default_seed")]
    seed: u64,
}

fn manipulability_report(lang: Lang, req: ManipulabilityRequest) -> ApiResult<Vec<Manipulability>> {
    if !(3..=5).contains(&req.candidates) || req.samples > MAX_SAMPLES {
        let message = lang.pick(
            format!("candidates must be 3 to 5 and samples at most {MAX_SAMPLES}"),
            format!("candidates doit aller de 3 à 5, et samples ne pas dépasser {MAX_SAMPLES}"),
        );
        return Err(ApiError::new(lang, message));
    }
    Ok(req.methods.iter().map(|&m| manipulability(m, req.candidates, req.samples, req.seed)).collect())
}

fn default_attempts() -> usize {
    20_000
}

#[derive(Deserialize)]
struct CounterexampleRequest {
    method: Method,
    criterion: Criterion,
    #[serde(default = "default_seed")]
    seed: u64,
    #[serde(default = "default_attempts")]
    attempts: usize,
}

#[derive(Serialize)]
struct CounterexampleResponse {
    /// What the literature says.
    satisfied: bool,
    /// A counterexample found by search, if any.
    counterexample: Option<Counterexample>,
}

fn counterexample(lang: Lang, req: CounterexampleRequest) -> CounterexampleResponse {
    let satisfied = satisfies(req.method, req.criterion);
    let counterexample = if satisfied {
        None
    } else {
        find_counterexample_in(req.method, req.criterion, req.seed, req.attempts.min(MAX_ATTEMPTS), lang)
    };
    CounterexampleResponse { satisfied, counterexample }
}

fn default_voters() -> usize {
    3
}

#[derive(Deserialize)]
struct ArrowRequest {
    rule: Rule,
    #[serde(default = "default_voters")]
    voters: usize,
}

fn arrow(lang: Lang, req: ArrowRequest) -> ApiResult<ArrowReport> {
    if !(2..=MAX_ARROW_VOTERS).contains(&req.voters) {
        let message = lang.pick(
            format!("voters must be between 2 and {MAX_ARROW_VOTERS}"),
            format!("voters doit aller de 2 à {MAX_ARROW_VOTERS}"),
        );
        return Err(ApiError::new(lang, message));
    }
    Ok(check_arrow(req.rule, req.voters))
}

fn default_groups() -> usize {
    4
}

#[derive(Deserialize)]
struct RandomRequest {
    #[serde(default = "default_candidates")]
    candidates: usize,
    #[serde(default = "default_groups")]
    groups: usize,
    #[serde(default = "default_seed")]
    seed: u64,
}

fn random(lang: Lang, req: RandomRequest) -> ApiResult<Election> {
    if !(2..=6).contains(&req.candidates) || !(1..=12).contains(&req.groups) {
        let message = lang.pick(
            "candidates must be 2 to 6 and groups 1 to 12",
            "candidates doit aller de 2 à 6, et groups de 1 à 12",
        );
        return Err(ApiError::new(lang, message));
    }
    Ok(random_election(&mut Rng::new(req.seed), req.candidates, req.groups, 20))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};

    fn call(endpoint: &str, lang: Lang, body: Option<Value>) -> Result<Value, String> {
        let body = body.map_or_else(String::new, |b| b.to_string());
        handle(endpoint, lang, &body).map(|json| serde_json::from_str(&json).unwrap()).map_err(|e| e.to_string())
    }

    fn get(endpoint: &str) -> Value {
        call(endpoint, Lang::En, None).unwrap()
    }

    fn post(endpoint: &str, body: Value) -> Result<Value, String> {
        call(endpoint, Lang::En, Some(body))
    }

    fn post_fr(endpoint: &str, body: Value) -> Result<Value, String> {
        call(endpoint, Lang::Fr, Some(body))
    }

    fn spoiler_election() -> Value {
        json!({
            "candidates": ["Ada", "Bea", "Cal"],
            "ballots": [
                {"weight": 40, "ranking": [0, 1, 2]},
                {"weight": 35, "ranking": [1, 2, 0]},
                {"weight": 25, "ranking": [2, 1, 0]}
            ]
        })
    }

    #[test]
    fn health_and_catalogue() {
        assert_eq!(get("health")["ok"], true);
        let methods = get("methods");
        assert_eq!(methods.as_array().unwrap().len(), Method::ALL.len());
        assert!(methods[0]["rigging"].as_array().unwrap().len() >= 2);
        assert_eq!(get("/scenarios")[0]["id"], "riverton");
    }

    #[test]
    fn elect_fills_in_ballots_and_reports_spoilers() {
        let body = post("elect", json!({"election": spoiler_election(), "methods": ["plurality", "irv"]})).unwrap();
        assert_eq!(body["pairwise"]["condorcet_winner"], 1);
        assert_eq!(body["results"][0]["outcome"]["winner"], 0);
        assert_eq!(body["results"][1]["outcome"]["winner"], 1);
        assert_eq!(body["results"][0]["spoilers"].as_array().unwrap().len(), 2);
        assert_eq!(body["election"]["ballots"][0]["scores"], json!([5, 3, 0]));
    }

    #[test]
    fn bad_input_is_an_error() {
        let bad = json!({"election": {"candidates": ["A", "B"], "ballots": [{"ranking": [0, 0]}]}});
        assert!(post("elect", bad).unwrap_err().contains("exactly once"));
        let error = post("elect", json!({"nope": true})).unwrap_err();
        assert!(
            error.starts_with("Failed to deserialize the JSON body into the target type: missing field"),
            "{error}"
        );
        let bad = json!({"election": {"candidates": ["A", "B"], "ballots": [{"ranking": "x"}]}});
        let error = post("elect", bad).unwrap_err();
        assert!(error.contains("election.ballots[0].ranking: invalid type"), "{error}");
        for body in ["", "{", "{\"election\": ", "nope"] {
            let error = handle("elect", Lang::En, body).unwrap_err().to_string();
            assert!(error.starts_with("Failed to parse the request body as JSON"), "{body:?}: {error}");
        }
        assert_eq!(handle("nowhere", Lang::En, "").unwrap_err().to_string(), "no such endpoint");
    }

    #[test]
    fn spatial_and_yee() {
        let model = json!({
            "candidates": [{"name": "Ada", "x": 0.2, "y": 0.5}, {"name": "Bea", "x": 0.8, "y": 0.5}],
            "crowds": [{"x": 0.25, "y": 0.5, "count": 30}, {"x": 0.75, "y": 0.5, "count": 20}],
            "voters": [{"x": 0.9, "y": 0.9}]
        });
        let body = post("spatial", json!({"model": model, "methods": ["plurality"]})).unwrap();
        assert_eq!(body["voters"].as_array().unwrap().len(), 51);
        assert_eq!(body["results"][0]["outcome"]["winner"], 0);
        assert_eq!(body["results"][0]["votes"][0]["ballot"]["ranking"], json!([1, 0]));
        let yee = post("yee", json!({"model": model, "method": "plurality", "resolution": 4})).unwrap();
        assert_eq!(yee["cells"], json!([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1]));
        assert!(post("yee", json!({"model": model, "method": "plurality", "resolution": 1000})).is_err());
    }

    #[test]
    fn manipulation_counterexample_and_arrow() {
        let body = post("manipulate", json!({"election": spoiler_election(), "method": "plurality"})).unwrap();
        assert!(body["manipulations"].as_array().unwrap().iter().any(|m| m["tactic"] == "compromising"));

        let body = post("counterexample", json!({"method": "irv", "criterion": "monotonicity"})).unwrap();
        assert_eq!(body["satisfied"], false);
        assert!(body["counterexample"]["explanation"].is_string());
        let body = post("counterexample", json!({"method": "schulze", "criterion": "condorcet_winner"})).unwrap();
        assert_eq!(body["satisfied"], true);
        assert!(body["counterexample"].is_null());

        let body = post("arrow", json!({"rule": "dictatorship"})).unwrap();
        assert_eq!(body["dictator"], 0);
        assert!(body["iia"].is_null());
        let body = post("arrow", json!({"rule": "pairwise_majority", "voters": 3})).unwrap();
        assert!(body["transitivity"]["cycle"].is_array());
        assert!(post("arrow", json!({"rule": "borda", "voters": 9})).is_err());
    }

    #[test]
    fn answers_in_french_when_asked() {
        let methods = call("methods", Lang::Fr, None).unwrap();
        assert_eq!(methods[0]["name"], "Scrutin à un tour");
        assert!(methods[0]["summary"].as_str().unwrap().starts_with("Une seule croix"));
        // French typography: a narrow no-break space before the question mark.
        let criteria = call("criteria", Lang::Fr, None).unwrap();
        assert_eq!(criteria[0]["name"], "Majorité");
        assert!(criteria[0]["question"].as_str().unwrap().ends_with("toujours\u{202f}?"));
        assert_eq!(call("scenarios", Lang::Fr, None).unwrap()[0]["title"], "Riverton élit son maire");
        assert_eq!(get("methods")[0]["name"], "Plurality");

        let request = json!({"election": spoiler_election(), "methods": ["two_round"]});
        let body = post_fr("elect", request.clone()).unwrap();
        let rounds = &body["results"][0]["outcome"]["rounds"];
        assert_eq!(rounds[0]["title"], "Premier tour");
        assert_eq!(rounds[1]["notes"][0], "Bea remporte le second tour face à Ada.");
        assert_eq!(body["election"]["candidates"], json!(["Ada", "Bea", "Cal"]));
        let body = post("elect", request).unwrap();
        assert_eq!(body["results"][0]["outcome"]["rounds"][1]["title"], "Runoff");

        let body = post_fr("manipulate", json!({"election": spoiler_election(), "method": "plurality"})).unwrap();
        let explanations: Vec<&str> =
            body["manipulations"].as_array().unwrap().iter().map(|m| m["explanation"].as_str().unwrap()).collect();
        assert!(explanations.iter().any(|x| x.contains("(vote utile\u{a0}: en remontant Bea)")), "{explanations:?}");
        let body = post_fr("counterexample", json!({"method": "irv", "criterion": "monotonicity"})).unwrap();
        assert!(body["counterexample"]["explanation"].as_str().unwrap().contains("plus de soutien a fait perdre"));
    }

    #[test]
    fn french_errors() {
        let bad = json!({"election": {"candidates": ["A", "B"], "ballots": [{"ranking": [0, 0]}]}});
        assert_eq!(
            post_fr("elect", bad).unwrap_err(),
            "bulletin 0\u{a0}: le classement doit citer chaque candidat exactement une fois"
        );
        let error = post_fr("elect", json!({"nope": true})).unwrap_err();
        assert!(error.starts_with("le JSON reçu ne correspond pas au format attendu\u{a0}: missing field"), "{error}");
        let error = handle("elect", Lang::Fr, "{").unwrap_err().to_string();
        assert!(error.starts_with("le corps de la requête n’est pas du JSON valide\u{a0}: "), "{error}");
        assert_eq!(handle("nowhere", Lang::Fr, "").unwrap_err().to_string(), "aucun point d’accès à cette adresse");
        assert_eq!(post_fr("arrow", json!({"rule": "borda", "voters": 9})).unwrap_err(), "voters doit aller de 2 à 4");
    }

    #[test]
    fn manipulability_and_random() {
        let body =
            post("manipulability", json!({"methods": ["dictatorship", "borda"], "samples": 40, "seed": 1})).unwrap();
        assert_eq!(body[0]["manipulable"], 0);
        assert!(body[1]["rate"].as_f64().unwrap() > 0.0);
        let election = post("random", json!({"candidates": 4, "groups": 5, "seed": 3})).unwrap();
        assert_eq!(election["candidates"].as_array().unwrap().len(), 4);
        assert_eq!(election["ballots"].as_array().unwrap().len(), 5);
    }
}
