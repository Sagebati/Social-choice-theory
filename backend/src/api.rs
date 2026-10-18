//! The HTTP API. Plain Axum, so it runs (and is tested) natively as well as
//! inside the Cloudflare Worker.
//!
//! Every endpoint takes an optional `?lang=` (`en`, the default, or `fr`, also
//! as a regional tag like `fr-FR`) and answers in that language: explanations,
//! descriptions and error messages alike.

use axum::extract::rejection::JsonRejection;
use axum::extract::{FromRequest, FromRequestParts, Request};
use axum::http::request::Parts;
use axum::http::{StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Router;
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
use std::convert::Infallible;

/// Upper bounds that keep every request cheap enough for a Worker.
const MAX_BALLOTS: usize = 2_000;
const MAX_VOTERS: usize = 3_000;
const MAX_MANIPULATION_BALLOTS: usize = 40;
const MAX_YEE_RESOLUTION: usize = 64;
const MAX_YEE_CROWD: u32 = 200;
const MAX_SAMPLES: usize = 500;
const MAX_ATTEMPTS: usize = 40_000;

pub fn router() -> Router {
    Router::new()
        .route("/api/health", get(health))
        .route("/api/methods", get(methods))
        .route("/api/criteria", get(criteria))
        .route("/api/scenarios", get(scenarios_list))
        .route("/api/elect", post(elect))
        .route("/api/spatial", post(spatial))
        .route("/api/yee", post(yee_diagram))
        .route("/api/manipulate", post(manipulate))
        .route("/api/manipulability", post(manipulability_report))
        .route("/api/counterexample", post(counterexample))
        .route("/api/arrow", post(arrow))
        .route("/api/random", post(random))
        .fallback(|Language(lang): Language| async move {
            ApiError::new(
                StatusCode::NOT_FOUND,
                lang,
                lang.pick("no such endpoint", "aucun point d’accès à cette adresse"),
            )
        })
}

/// The language asked for with `?lang=`. Anything missing or unknown is English.
#[derive(Debug, Clone, Copy, Default)]
pub struct Language(pub Lang);

impl Language {
    fn of(uri: &Uri) -> Self {
        let lang = uri
            .query()
            .into_iter()
            .flat_map(|query| query.split('&'))
            .find_map(|pair| pair.strip_prefix("lang="))
            .and_then(|code| code.parse().ok())
            .unwrap_or_default();
        Language(lang)
    }
}

impl<S: Send + Sync> FromRequestParts<S> for Language {
    type Rejection = Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        Ok(Language::of(&parts.uri))
    }
}

/// A JSON reply in the client's language. French replies get French
/// typography (no-break spaces before `: ; ! ?` and inside « ») in every string.
pub struct Reply<T> {
    lang: Lang,
    body: T,
}

impl<T: Serialize> IntoResponse for Reply<T> {
    fn into_response(self) -> Response {
        if self.lang == Lang::En {
            return axum::Json(self.body).into_response();
        }
        match serde_json::to_value(&self.body) {
            Ok(mut value) => {
                typeset(&mut value, self.lang);
                axum::Json(value).into_response()
            }
            Err(error) => {
                ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, self.lang, error.to_string()).into_response()
            }
        }
    }
}

fn reply<T>(lang: Lang, body: T) -> Reply<T> {
    Reply { lang, body }
}

fn typeset(value: &mut Value, lang: Lang) {
    match value {
        Value::String(text) => *text = lang.typeset(text),
        Value::Array(items) => items.iter_mut().for_each(|v| typeset(v, lang)),
        Value::Object(fields) => fields.values_mut().for_each(|v| typeset(v, lang)),
        _ => {}
    }
}

/// An error as `{"error": "..."}` with a status code, in the client's language.
#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    fn new(status: StatusCode, lang: Lang, message: impl AsRef<str>) -> Self {
        ApiError { status, message: lang.typeset(message.as_ref()) }
    }

    fn bad_request(lang: Lang, message: impl AsRef<str>) -> Self {
        ApiError::new(StatusCode::BAD_REQUEST, lang, message)
    }

    fn election(lang: Lang, error: social_choice::Error) -> Self {
        ApiError::bad_request(lang, error.message_in(lang))
    }

    /// A body that isn't the JSON the endpoint expects.
    fn rejected(rejection: JsonRejection, lang: Lang) -> Self {
        let status = rejection.status();
        if lang == Lang::En {
            return ApiError::new(status, lang, rejection.body_text());
        }
        let detail = || std::error::Error::source(&rejection).and_then(|e| e.source()).map(|e| e.to_string());
        let message = match &rejection {
            JsonRejection::JsonDataError(_) => {
                format!("le JSON reçu ne correspond pas au format attendu : {}", detail().unwrap_or_default())
            }
            JsonRejection::JsonSyntaxError(_) => {
                format!("le corps de la requête n’est pas du JSON valide : {}", detail().unwrap_or_default())
            }
            JsonRejection::MissingJsonContentType(_) => {
                "il faut l’en-tête « Content-Type: application/json »".to_string()
            }
            _ => "impossible de lire le corps de la requête".to_string(),
        };
        ApiError::new(status, lang, message)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        #[derive(Serialize)]
        struct Body {
            error: String,
        }
        (self.status, axum::Json(Body { error: self.message })).into_response()
    }
}

/// `axum::Json`, but a malformed body gets the same JSON error shape as
/// everything else, in the client's language.
pub struct Json<T>(pub T);

impl<T, S> FromRequest<S> for Json<T>
where
    axum::Json<T>: FromRequest<S, Rejection = JsonRejection>,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        let Language(lang) = Language::of(req.uri());
        match axum::Json::<T>::from_request(req, state).await {
            Ok(axum::Json(value)) => Ok(Json(value)),
            Err(rejection) => Err(ApiError::rejected(rejection, lang)),
        }
    }
}

type ApiResult<T> = Result<Reply<T>, ApiError>;

fn all_methods() -> Vec<Method> {
    Method::ALL.to_vec()
}

fn checked(election: Election, lang: Lang) -> Result<Election, ApiError> {
    if election.ballots.len() > MAX_BALLOTS {
        let message =
            lang.pick(format!("at most {MAX_BALLOTS} ballots"), format!("{MAX_BALLOTS} bulletins au maximum"));
        return Err(ApiError::bad_request(lang, message));
    }
    election.complete().map_err(|e| ApiError::election(lang, e))
}

fn checked_model(model: &SpatialModel, lang: Lang) -> Result<(), ApiError> {
    let finite = |x: f64| x.is_finite() && x.abs() <= 10.0;
    let candidates_ok = model.candidates.iter().all(|c| finite(c.x) && finite(c.y));
    let voters_ok = model.voters.iter().all(|p| finite(p.x) && finite(p.y))
        && model.crowds.iter().all(|c| finite(c.x) && finite(c.y) && finite(c.spread) && c.spread >= 0.0);
    if !candidates_ok || !voters_ok {
        return Err(ApiError::bad_request(
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
        return Err(ApiError::bad_request(lang, message));
    }
    if !(0.0..=1.0).contains(&model.strategic) {
        return Err(ApiError::bad_request(
            lang,
            lang.pick("strategic must be between 0 and 1", "strategic doit aller de 0 à 1"),
        ));
    }
    if model.approval_radius.is_some_and(|r| !r.is_finite() || r < 0.0) {
        return Err(ApiError::bad_request(
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

async fn health(Language(lang): Language) -> Reply<Health> {
    reply(lang, Health { ok: true, version: env!("CARGO_PKG_VERSION") })
}

async fn methods(Language(lang): Language) -> Reply<Vec<catalog::MethodInfo>> {
    reply(lang, catalog::all_in(lang))
}

async fn criteria(Language(lang): Language) -> Reply<Vec<catalog::CriterionInfo>> {
    reply(lang, catalog::criteria_in(lang))
}

async fn scenarios_list(Language(lang): Language) -> Reply<Vec<scenarios::Scenario>> {
    reply(lang, scenarios::all_in(lang))
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

async fn elect(Language(lang): Language, Json(req): Json<ElectRequest>) -> ApiResult<ElectResponse> {
    let election = checked(req.election, lang)?;
    let results = req
        .methods
        .iter()
        .map(|&m| MethodResult { outcome: m.run_in(&election, lang), spoilers: find_spoilers(&election, m) })
        .collect();
    Ok(reply(lang, ElectResponse { pairwise: PairwiseMatrix::new(&election).summary(), results, election }))
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

async fn spatial(Language(lang): Language, Json(req): Json<SpatialRequest>) -> ApiResult<SpatialResponse> {
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
    Ok(reply(
        lang,
        SpatialResponse {
            voters: req.model.voter_points(),
            pairwise: PairwiseMatrix::new(&honest).summary(),
            honest,
            results,
        },
    ))
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

async fn yee_diagram(Language(lang): Language, Json(req): Json<YeeRequest>) -> ApiResult<YeeResponse> {
    checked_model(&req.model, lang)?;
    if !(1..=MAX_YEE_RESOLUTION).contains(&req.resolution) {
        let message = lang.pick(
            format!("resolution must be between 1 and {MAX_YEE_RESOLUTION}"),
            format!("resolution doit aller de 1 à {MAX_YEE_RESOLUTION}"),
        );
        return Err(ApiError::bad_request(lang, message));
    }
    if !(1..=MAX_YEE_CROWD).contains(&req.count) || !(0.0..=1.0).contains(&req.spread) {
        let message = lang.pick(
            format!("count must be 1 to {MAX_YEE_CROWD} and spread 0 to 1"),
            format!("count doit aller de 1 à {MAX_YEE_CROWD} et spread de 0 à 1"),
        );
        return Err(ApiError::bad_request(lang, message));
    }
    let cells = yee(&req.model, req.method, req.resolution, req.spread, req.count);
    Ok(reply(lang, YeeResponse { method: req.method, resolution: req.resolution, cells }))
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

async fn manipulate(Language(lang): Language, Json(req): Json<ManipulateRequest>) -> ApiResult<ManipulateResponse> {
    let election = checked(req.election, lang)?.compress();
    if election.ballots.len() > MAX_MANIPULATION_BALLOTS {
        let message = lang.pick(
            format!("at most {MAX_MANIPULATION_BALLOTS} distinct ballots for a manipulation search"),
            format!("{MAX_MANIPULATION_BALLOTS} bulletins différents au maximum pour une recherche de manipulation"),
        );
        return Err(ApiError::bad_request(lang, message));
    }
    Ok(reply(
        lang,
        ManipulateResponse {
            honest: req.method.run_in(&election, lang),
            manipulations: find_manipulations_in(&election, req.method, req.limit.min(50), lang),
            spoilers: find_spoilers(&election, req.method),
        },
    ))
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

async fn manipulability_report(
    Language(lang): Language,
    Json(req): Json<ManipulabilityRequest>,
) -> ApiResult<Vec<Manipulability>> {
    if !(3..=5).contains(&req.candidates) || req.samples > MAX_SAMPLES {
        let message = lang.pick(
            format!("candidates must be 3 to 5 and samples at most {MAX_SAMPLES}"),
            format!("candidates doit aller de 3 à 5, et samples ne pas dépasser {MAX_SAMPLES}"),
        );
        return Err(ApiError::bad_request(lang, message));
    }
    let report = req.methods.iter().map(|&m| manipulability(m, req.candidates, req.samples, req.seed)).collect();
    Ok(reply(lang, report))
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

async fn counterexample(
    Language(lang): Language,
    Json(req): Json<CounterexampleRequest>,
) -> ApiResult<CounterexampleResponse> {
    let satisfied = satisfies(req.method, req.criterion);
    let counterexample = if satisfied {
        None
    } else {
        find_counterexample_in(req.method, req.criterion, req.seed, req.attempts.min(MAX_ATTEMPTS), lang)
    };
    Ok(reply(lang, CounterexampleResponse { satisfied, counterexample }))
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

async fn arrow(Language(lang): Language, Json(req): Json<ArrowRequest>) -> ApiResult<ArrowReport> {
    if !(2..=MAX_ARROW_VOTERS).contains(&req.voters) {
        let message = lang.pick(
            format!("voters must be between 2 and {MAX_ARROW_VOTERS}"),
            format!("voters doit aller de 2 à {MAX_ARROW_VOTERS}"),
        );
        return Err(ApiError::bad_request(lang, message));
    }
    Ok(reply(lang, check_arrow(req.rule, req.voters)))
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

async fn random(Language(lang): Language, Json(req): Json<RandomRequest>) -> ApiResult<Election> {
    if !(2..=6).contains(&req.candidates) || !(1..=12).contains(&req.groups) {
        let message = lang.pick(
            "candidates must be 2 to 6 and groups 1 to 12",
            "candidates doit aller de 2 à 6, et groups de 1 à 12",
        );
        return Err(ApiError::bad_request(lang, message));
    }
    Ok(reply(lang, random_election(&mut Rng::new(req.seed), req.candidates, req.groups, 20)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::{to_bytes, Body};
    use axum::http::{Method as HttpMethod, Request};
    use serde_json::{json, Value};
    use tower::ServiceExt;

    fn call(method: HttpMethod, path: &str, body: Option<Value>) -> (StatusCode, Value) {
        futures_executor::block_on(async {
            let request = Request::builder()
                .method(method)
                .uri(path)
                .header("content-type", "application/json")
                .body(body.map_or_else(Body::empty, |b| Body::from(b.to_string())))
                .unwrap();
            let response = router().oneshot(request).await.unwrap();
            let status = response.status();
            let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
            (status, serde_json::from_slice(&bytes).unwrap())
        })
    }

    fn post(path: &str, body: Value) -> (StatusCode, Value) {
        call(HttpMethod::POST, path, Some(body))
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
        assert_eq!(call(HttpMethod::GET, "/api/health", None).1["ok"], true);
        let (_, methods) = call(HttpMethod::GET, "/api/methods", None);
        assert_eq!(methods.as_array().unwrap().len(), Method::ALL.len());
        assert!(methods[0]["rigging"].as_array().unwrap().len() >= 2);
        let (_, scenarios) = call(HttpMethod::GET, "/api/scenarios", None);
        assert_eq!(scenarios[0]["id"], "riverton");
    }

    #[test]
    fn elect_fills_in_ballots_and_reports_spoilers() {
        let (status, body) =
            post("/api/elect", json!({"election": spoiler_election(), "methods": ["plurality", "irv"]}));
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["pairwise"]["condorcet_winner"], 1);
        assert_eq!(body["results"][0]["outcome"]["winner"], 0);
        assert_eq!(body["results"][1]["outcome"]["winner"], 1);
        assert_eq!(body["results"][0]["spoilers"].as_array().unwrap().len(), 2);
        assert_eq!(body["election"]["ballots"][0]["scores"], json!([5, 3, 0]));
    }

    #[test]
    fn bad_input_is_a_json_400() {
        let bad = json!({"election": {"candidates": ["A", "B"], "ballots": [{"ranking": [0, 0]}]}});
        let (status, body) = post("/api/elect", bad);
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(body["error"].as_str().unwrap().contains("exactly once"));
        let (status, body) = post("/api/elect", json!({"nope": true}));
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert!(body["error"].is_string());
        let (status, _) = call(HttpMethod::GET, "/api/nowhere", None);
        assert_eq!(status, StatusCode::NOT_FOUND);
    }

    #[test]
    fn spatial_and_yee() {
        let model = json!({
            "candidates": [{"name": "Ada", "x": 0.2, "y": 0.5}, {"name": "Bea", "x": 0.8, "y": 0.5}],
            "crowds": [{"x": 0.25, "y": 0.5, "count": 30}, {"x": 0.75, "y": 0.5, "count": 20}],
            "voters": [{"x": 0.9, "y": 0.9}]
        });
        let (status, body) = post("/api/spatial", json!({"model": model, "methods": ["plurality"]}));
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["voters"].as_array().unwrap().len(), 51);
        assert_eq!(body["results"][0]["outcome"]["winner"], 0);
        assert_eq!(body["results"][0]["votes"][0]["ballot"]["ranking"], json!([1, 0]));
        let (_, yee) = post("/api/yee", json!({"model": model, "method": "plurality", "resolution": 4}));
        assert_eq!(yee["cells"], json!([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1]));
        let (status, _) = post("/api/yee", json!({"model": model, "method": "plurality", "resolution": 1000}));
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[test]
    fn manipulation_counterexample_and_arrow() {
        let (_, body) = post("/api/manipulate", json!({"election": spoiler_election(), "method": "plurality"}));
        assert!(body["manipulations"].as_array().unwrap().iter().any(|m| m["tactic"] == "compromising"));

        let (_, body) = post("/api/counterexample", json!({"method": "irv", "criterion": "monotonicity"}));
        assert_eq!(body["satisfied"], false);
        assert!(body["counterexample"]["explanation"].is_string());
        let (_, body) = post("/api/counterexample", json!({"method": "schulze", "criterion": "condorcet_winner"}));
        assert_eq!(body["satisfied"], true);
        assert!(body["counterexample"].is_null());

        let (_, body) = post("/api/arrow", json!({"rule": "dictatorship"}));
        assert_eq!(body["dictator"], 0);
        assert!(body["iia"].is_null());
        let (_, body) = post("/api/arrow", json!({"rule": "pairwise_majority", "voters": 3}));
        assert!(body["transitivity"]["cycle"].is_array());
        let (status, _) = post("/api/arrow", json!({"rule": "borda", "voters": 9}));
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[test]
    fn answers_in_french_when_asked() {
        let (_, methods) = call(HttpMethod::GET, "/api/methods?lang=fr", None);
        assert_eq!(methods[0]["name"], "Scrutin à un tour");
        assert!(methods[0]["summary"].as_str().unwrap().starts_with("Une seule croix"));
        // French typography: a narrow no-break space before the question mark.
        let (_, criteria) = call(HttpMethod::GET, "/api/criteria?lang=fr-FR", None);
        assert_eq!(criteria[0]["name"], "Majorité");
        assert!(criteria[0]["question"].as_str().unwrap().ends_with("toujours\u{202f}?"));
        let (_, scenarios) = call(HttpMethod::GET, "/api/scenarios?x=1&lang=FR", None);
        assert_eq!(scenarios[0]["title"], "Riverton élit son maire");
        // Anything else is English.
        for path in ["/api/methods", "/api/methods?lang=de", "/api/methods?lang="] {
            assert_eq!(call(HttpMethod::GET, path, None).1[0]["name"], "Plurality", "{path}");
        }

        let request = json!({"election": spoiler_election(), "methods": ["two_round"]});
        let (status, body) = post("/api/elect?lang=fr", request.clone());
        assert_eq!(status, StatusCode::OK);
        let rounds = &body["results"][0]["outcome"]["rounds"];
        assert_eq!(rounds[0]["title"], "Premier tour");
        assert_eq!(rounds[1]["notes"][0], "Bea remporte le second tour face à Ada.");
        assert_eq!(body["election"]["candidates"], json!(["Ada", "Bea", "Cal"]));
        let (_, body) = post("/api/elect", request);
        assert_eq!(body["results"][0]["outcome"]["rounds"][1]["title"], "Runoff");

        let (_, body) = post("/api/manipulate?lang=fr", json!({"election": spoiler_election(), "method": "plurality"}));
        let explanations: Vec<&str> =
            body["manipulations"].as_array().unwrap().iter().map(|m| m["explanation"].as_str().unwrap()).collect();
        assert!(explanations.iter().any(|x| x.contains("(vote utile\u{a0}: en remontant Bea)")), "{explanations:?}");
        let (_, body) = post("/api/counterexample?lang=fr", json!({"method": "irv", "criterion": "monotonicity"}));
        assert!(body["counterexample"]["explanation"].as_str().unwrap().contains("plus de soutien a fait perdre"));
    }

    #[test]
    fn french_errors() {
        let bad = json!({"election": {"candidates": ["A", "B"], "ballots": [{"ranking": [0, 0]}]}});
        let (status, body) = post("/api/elect?lang=fr", bad);
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(body["error"], "bulletin 0\u{a0}: le classement doit citer chaque candidat exactement une fois");
        let (status, body) = post("/api/elect?lang=fr", json!({"nope": true}));
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        let error = body["error"].as_str().unwrap();
        assert!(error.starts_with("le JSON reçu ne correspond pas au format attendu\u{a0}: missing field"), "{error}");
        let (status, body) = call(HttpMethod::GET, "/api/nowhere?lang=fr", None);
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body["error"], "aucun point d’accès à cette adresse");
        let (_, body) = post("/api/arrow?lang=fr", json!({"rule": "borda", "voters": 9}));
        assert_eq!(body["error"], "voters doit aller de 2 à 4");
    }

    #[test]
    fn manipulability_and_random() {
        let (_, body) =
            post("/api/manipulability", json!({"methods": ["dictatorship", "borda"], "samples": 40, "seed": 1}));
        assert_eq!(body[0]["manipulable"], 0);
        assert!(body[1]["rate"].as_f64().unwrap() > 0.0);
        let (_, election) = post("/api/random", json!({"candidates": 4, "groups": 5, "seed": 3}));
        assert_eq!(election["candidates"].as_array().unwrap().len(), 4);
        assert_eq!(election["ballots"].as_array().unwrap().len(), 5);
    }
}
