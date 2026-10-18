//! The HTTP API. Plain Axum, so it runs (and is tested) natively as well as
//! inside the Cloudflare Worker.

use axum::extract::rejection::JsonRejection;
use axum::extract::FromRequest;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Router;
use serde::{Deserialize, Serialize};
use social_choice::arrow::{check_arrow, ArrowReport, Rule, MAX_ARROW_VOTERS};
use social_choice::criteria::{find_counterexample, satisfies, Counterexample};
use social_choice::manipulation::{
    find_manipulations, find_spoilers, manipulability, Manipulability, Manipulation, Spoiler,
};
use social_choice::pairwise::PairwiseSummary;
use social_choice::random::{random_election, Rng};
use social_choice::spatial::{yee, Point, SpatialModel, SpatialVote};
use social_choice::{catalog, scenarios, Criterion, Election, Method, Outcome, PairwiseMatrix};

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
        .fallback(|| async { ApiError::new(StatusCode::NOT_FOUND, "no such endpoint") })
}

/// An error as `{"error": "..."}` with a status code.
#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    fn new(status: StatusCode, message: impl Into<String>) -> Self {
        ApiError { status, message: message.into() }
    }

    fn bad_request(message: impl Into<String>) -> Self {
        ApiError::new(StatusCode::BAD_REQUEST, message)
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

impl From<JsonRejection> for ApiError {
    fn from(rejection: JsonRejection) -> Self {
        ApiError::new(rejection.status(), rejection.body_text())
    }
}

impl From<social_choice::Error> for ApiError {
    fn from(error: social_choice::Error) -> Self {
        ApiError::bad_request(error.to_string())
    }
}

/// `axum::Json`, but malformed bodies get the same JSON error shape as
/// everything else.
#[derive(FromRequest)]
#[from_request(via(axum::Json), rejection(ApiError))]
pub struct Json<T>(pub T);

impl<T: Serialize> IntoResponse for Json<T> {
    fn into_response(self) -> Response {
        axum::Json(self.0).into_response()
    }
}

type ApiResult<T> = Result<Json<T>, ApiError>;

fn all_methods() -> Vec<Method> {
    Method::ALL.to_vec()
}

fn checked(election: Election) -> Result<Election, ApiError> {
    if election.ballots.len() > MAX_BALLOTS {
        return Err(ApiError::bad_request(format!("at most {MAX_BALLOTS} ballots")));
    }
    Ok(election.complete()?)
}

fn checked_model(model: &SpatialModel) -> Result<(), ApiError> {
    let finite = |x: f64| x.is_finite() && x.abs() <= 10.0;
    let candidates_ok = model.candidates.iter().all(|c| finite(c.x) && finite(c.y));
    let voters_ok = model.voters.iter().all(|p| finite(p.x) && finite(p.y))
        && model.crowds.iter().all(|c| finite(c.x) && finite(c.y) && finite(c.spread) && c.spread >= 0.0);
    if !candidates_ok || !voters_ok {
        return Err(ApiError::bad_request("coordinates must be finite numbers between -10 and 10"));
    }
    let voters = model.voters.len() as u64 + model.crowds.iter().map(|c| u64::from(c.count)).sum::<u64>();
    if voters > MAX_VOTERS as u64 {
        return Err(ApiError::bad_request(format!("at most {MAX_VOTERS} voters")));
    }
    if !(0.0..=1.0).contains(&model.strategic) {
        return Err(ApiError::bad_request("strategic must be between 0 and 1"));
    }
    if model.approval_radius.is_some_and(|r| !r.is_finite() || r < 0.0) {
        return Err(ApiError::bad_request("approval_radius must be a non-negative number"));
    }
    // Reuse the election checks for the candidate list and score scale.
    let mut probe = Election::new(model.candidates.iter().map(|c| c.name.clone()));
    probe.max_score = model.max_score;
    probe.complete()?;
    Ok(())
}

#[derive(Serialize)]
struct Health {
    ok: bool,
    version: &'static str,
}

async fn health() -> Json<Health> {
    Json(Health { ok: true, version: env!("CARGO_PKG_VERSION") })
}

async fn methods() -> Json<Vec<catalog::MethodInfo>> {
    Json(catalog::all())
}

async fn criteria() -> Json<Vec<catalog::CriterionInfo>> {
    Json(catalog::criteria())
}

async fn scenarios_list() -> Json<Vec<scenarios::Scenario>> {
    Json(scenarios::all())
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

async fn elect(Json(req): Json<ElectRequest>) -> ApiResult<ElectResponse> {
    let election = checked(req.election)?;
    let results = req
        .methods
        .iter()
        .map(|&m| MethodResult { outcome: m.run(&election), spoilers: find_spoilers(&election, m) })
        .collect();
    Ok(Json(ElectResponse { pairwise: PairwiseMatrix::new(&election).summary(), results, election }))
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

async fn spatial(Json(req): Json<SpatialRequest>) -> ApiResult<SpatialResponse> {
    checked_model(&req.model)?;
    let honest = req.model.honest_election().compress();
    let results = req
        .methods
        .iter()
        .map(|&m| {
            let r = req.model.run(m);
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
    Ok(Json(SpatialResponse {
        voters: req.model.voter_points(),
        pairwise: PairwiseMatrix::new(&honest).summary(),
        honest,
        results,
    }))
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

async fn yee_diagram(Json(req): Json<YeeRequest>) -> ApiResult<YeeResponse> {
    checked_model(&req.model)?;
    if !(1..=MAX_YEE_RESOLUTION).contains(&req.resolution) {
        return Err(ApiError::bad_request(format!("resolution must be between 1 and {MAX_YEE_RESOLUTION}")));
    }
    if !(1..=MAX_YEE_CROWD).contains(&req.count) || !(0.0..=1.0).contains(&req.spread) {
        return Err(ApiError::bad_request(format!("count must be 1 to {MAX_YEE_CROWD} and spread 0 to 1")));
    }
    let cells = yee(&req.model, req.method, req.resolution, req.spread, req.count);
    Ok(Json(YeeResponse { method: req.method, resolution: req.resolution, cells }))
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

async fn manipulate(Json(req): Json<ManipulateRequest>) -> ApiResult<ManipulateResponse> {
    let election = checked(req.election)?.compress();
    if election.ballots.len() > MAX_MANIPULATION_BALLOTS {
        return Err(ApiError::bad_request(format!(
            "at most {MAX_MANIPULATION_BALLOTS} distinct ballots for a manipulation search"
        )));
    }
    Ok(Json(ManipulateResponse {
        honest: req.method.run(&election),
        manipulations: find_manipulations(&election, req.method, req.limit.min(50)),
        spoilers: find_spoilers(&election, req.method),
    }))
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

async fn manipulability_report(Json(req): Json<ManipulabilityRequest>) -> ApiResult<Vec<Manipulability>> {
    if !(3..=5).contains(&req.candidates) || req.samples > MAX_SAMPLES {
        return Err(ApiError::bad_request(format!("candidates must be 3 to 5 and samples at most {MAX_SAMPLES}")));
    }
    let report = req.methods.iter().map(|&m| manipulability(m, req.candidates, req.samples, req.seed)).collect();
    Ok(Json(report))
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

async fn counterexample(Json(req): Json<CounterexampleRequest>) -> ApiResult<CounterexampleResponse> {
    let satisfied = satisfies(req.method, req.criterion);
    let counterexample = if satisfied {
        None
    } else {
        find_counterexample(req.method, req.criterion, req.seed, req.attempts.min(MAX_ATTEMPTS))
    };
    Ok(Json(CounterexampleResponse { satisfied, counterexample }))
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

async fn arrow(Json(req): Json<ArrowRequest>) -> ApiResult<ArrowReport> {
    if !(2..=MAX_ARROW_VOTERS).contains(&req.voters) {
        return Err(ApiError::bad_request(format!("voters must be between 2 and {MAX_ARROW_VOTERS}")));
    }
    Ok(Json(check_arrow(req.rule, req.voters)))
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

async fn random(Json(req): Json<RandomRequest>) -> ApiResult<Election> {
    if !(2..=6).contains(&req.candidates) || !(1..=12).contains(&req.groups) {
        return Err(ApiError::bad_request("candidates must be 2 to 6 and groups 1 to 12"));
    }
    Ok(Json(random_election(&mut Rng::new(req.seed), req.candidates, req.groups, 20)))
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
