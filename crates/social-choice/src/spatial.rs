//! The spatial model: voters and candidates are points on an opinion map, and a
//! voter likes a candidate more the closer the candidate stands.
//!
//! Coordinates are meant to lie in the unit square, but nothing enforces it.

use crate::election::{Ballot, CandidateId, Election, DEFAULT_MAX_SCORE};
use crate::lang::Lang;
use crate::methods::{BallotKind, Method};
use crate::outcome::Outcome;
use serde::{Deserialize, Serialize};

const GOLDEN_RATIO_CONJUGATE: f64 = 0.618_033_988_749_894_9;
const GOLDEN_ANGLE: f64 = 2.399_963_229_728_653;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl Point {
    pub fn distance(self, other: Point) -> f64 {
        ((self.x - other.x).powi(2) + (self.y - other.y).powi(2)).sqrt()
    }
}

fn default_spread() -> f64 {
    0.12
}

fn default_count() -> u32 {
    40
}

fn default_max_score() -> u32 {
    DEFAULT_MAX_SCORE
}

/// A disc of `count` voters around (`x`, `y`) with radius `spread`, laid out as a
/// sunflower so the crowd is even and identical every time.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Crowd {
    pub x: f64,
    pub y: f64,
    #[serde(default = "default_spread")]
    pub spread: f64,
    #[serde(default = "default_count")]
    pub count: u32,
}

impl Crowd {
    pub fn points(&self) -> Vec<Point> {
        (0..self.count)
            .map(|i| {
                let r = self.spread * ((f64::from(i) + 0.5) / f64::from(self.count)).sqrt();
                let theta = f64::from(i) * GOLDEN_ANGLE;
                Point { x: self.x + r * theta.cos(), y: self.y + r * theta.sin() }
            })
            .collect()
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpatialCandidate {
    pub name: String,
    pub x: f64,
    pub y: f64,
}

/// Candidates and voters on the map, plus how the voters fill in their ballots.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpatialModel {
    pub candidates: Vec<SpatialCandidate>,
    #[serde(default)]
    pub crowds: Vec<Crowd>,
    /// Individual voters, listed before the crowds.
    #[serde(default)]
    pub voters: Vec<Point>,
    /// Voters approve every candidate within this distance. When `None`, they
    /// approve every candidate closer than their average distance.
    #[serde(default)]
    pub approval_radius: Option<f64>,
    #[serde(default = "default_max_score")]
    pub max_score: u32,
    /// Share of voters, from 0 to 1, who vote strategically against the two
    /// front-runners of an honest poll.
    #[serde(default)]
    pub strategic: f64,
}

/// How one voter filled in their ballot.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpatialVote {
    pub ballot: Ballot,
    /// True for the voters who vote strategically.
    pub strategic: bool,
    /// True when the ballot differs from the voter's honest one.
    pub changed: bool,
}

/// The result of running a method on the map.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpatialResult {
    pub method: Method,
    pub outcome: Outcome,
    /// The two leaders of the honest poll that strategic voters react to.
    pub frontrunners: Vec<CandidateId>,
    /// One entry per voter, in [`SpatialModel::voter_points`] order.
    pub votes: Vec<SpatialVote>,
    /// The ballots as cast, with identical ballots merged.
    pub election: Election,
}

/// Deterministically picks roughly `share` of the voters, spread evenly through
/// the list.
fn is_strategic(i: usize, share: f64) -> bool {
    ((i as f64 + 1.0) * GOLDEN_RATIO_CONJUGATE).fract() < share
}

impl SpatialModel {
    pub fn candidate_points(&self) -> Vec<Point> {
        self.candidates.iter().map(|c| Point { x: c.x, y: c.y }).collect()
    }

    /// Every voter: the individual ones first, then each crowd in turn.
    pub fn voter_points(&self) -> Vec<Point> {
        let mut points = self.voters.clone();
        for crowd in &self.crowds {
            points.extend(crowd.points());
        }
        points
    }

    fn empty_election(&self) -> Election {
        let mut e = Election::new(self.candidates.iter().map(|c| c.name.clone()));
        e.max_score = self.max_score;
        e
    }

    /// The honest ballot of a voter standing at `p`.
    pub fn honest_ballot(&self, p: Point) -> Ballot {
        let utilities: Vec<f64> = self.candidate_points().iter().map(|&c| -p.distance(c)).collect();
        Ballot::from_utilities(&utilities, self.max_score, self.approval_radius.map(|r| -r))
    }

    /// One honest ballot per voter, in voter order.
    pub fn honest_election(&self) -> Election {
        let mut e = self.empty_election();
        e.ballots = self.voter_points().into_iter().map(|p| self.honest_ballot(p)).collect();
        e
    }

    /// Runs `method` on the voters at `points`.
    fn run_points(&self, points: &[Point], method: Method, lang: Lang) -> SpatialResult {
        let mut e = self.empty_election();
        let honest: Vec<Ballot> = points.iter().map(|&p| self.honest_ballot(p)).collect();
        e.ballots = honest.clone();
        let poll = method.run_in(&e.compress(), lang);
        let n = self.candidates.len();
        if self.strategic <= 0.0 || n < 2 || method == Method::Dictatorship {
            let votes =
                honest.into_iter().map(|ballot| SpatialVote { ballot, strategic: false, changed: false }).collect();
            return SpatialResult { method, outcome: poll, frontrunners: Vec::new(), votes, election: e.compress() };
        }
        let order = poll.order();
        let frontrunners = (order[0], order[1]);
        let candidates = self.candidate_points();
        let votes: Vec<SpatialVote> = points
            .iter()
            .zip(honest)
            .enumerate()
            .map(|(i, (&p, honest))| {
                if !is_strategic(i, self.strategic) {
                    return SpatialVote { ballot: honest, strategic: false, changed: false };
                }
                let distances: Vec<f64> = candidates.iter().map(|&c| p.distance(c)).collect();
                let ballot = strategic_ballot(&honest, &distances, method.ballot_kind(), frontrunners, self.max_score);
                let changed = ballot != honest;
                SpatialVote { ballot, strategic: true, changed }
            })
            .collect();
        e.ballots = votes.iter().map(|v| v.ballot.clone()).collect();
        let cast = e.compress();
        SpatialResult {
            method,
            outcome: method.run_in(&cast, lang),
            frontrunners: vec![frontrunners.0, frontrunners.1],
            votes,
            election: cast,
        }
    }

    pub fn run(&self, method: Method) -> SpatialResult {
        self.run_in(method, Lang::En)
    }

    /// [`SpatialModel::run`] with the count explained in `lang`.
    pub fn run_in(&self, method: Method, lang: Lang) -> SpatialResult {
        self.run_points(&self.voter_points(), method, lang)
    }
}

/// How a strategic voter at the given `distances` from each candidate votes,
/// knowing the two front-runners. They throw their weight behind whichever
/// front-runner they prefer and against the other one.
pub fn strategic_ballot(
    honest: &Ballot,
    distances: &[f64],
    kind: BallotKind,
    frontrunners: (CandidateId, CandidateId),
    max_score: u32,
) -> Ballot {
    let (a, b) = frontrunners;
    let (ally, rival) = if distances[a] <= distances[b] { (a, b) } else { (b, a) };
    let mut ballot = honest.clone();
    let without = |ranking: &[CandidateId], c: CandidateId| -> Vec<CandidateId> {
        ranking.iter().copied().filter(|&x| x != c).collect()
    };
    match kind {
        BallotKind::ChooseOne => {
            ballot.ranking = without(&honest.ranking, ally);
            ballot.ranking.insert(0, ally);
        }
        BallotKind::Veto => {
            ballot.ranking = without(&honest.ranking, rival);
            ballot.ranking.push(rival);
        }
        BallotKind::Ranked => {
            ballot.ranking = without(&without(&honest.ranking, ally), rival);
            ballot.ranking.insert(0, ally);
            ballot.ranking.push(rival);
        }
        BallotKind::Approval => {
            ballot.approvals = distances.iter().map(|&d| d <= distances[ally]).collect();
        }
        BallotKind::Score => {
            let (best, worst) = (distances[ally], distances[rival]);
            ballot.scores = distances
                .iter()
                .map(|&d| {
                    if d <= best {
                        max_score
                    } else if d >= worst {
                        0
                    } else {
                        ((worst - d) / (worst - best) * f64::from(max_score)).round() as u32
                    }
                })
                .collect();
        }
    }
    ballot
}

/// A Yee diagram: for every cell of a `resolution`×`resolution` grid over the
/// unit square, who would win if a crowd with the given `spread` and `count` were
/// centred there. Row-major, starting at the top-left (small `y`).
pub fn yee(model: &SpatialModel, method: Method, resolution: usize, spread: f64, count: u32) -> Vec<CandidateId> {
    let offsets = Crowd { x: 0.0, y: 0.0, spread, count }.points();
    let mut cells = Vec::with_capacity(resolution * resolution);
    let mut points = Vec::with_capacity(offsets.len());
    for row in 0..resolution {
        for col in 0..resolution {
            let cx = (col as f64 + 0.5) / resolution as f64;
            let cy = (row as f64 + 0.5) / resolution as f64;
            points.clear();
            points.extend(offsets.iter().map(|o| Point { x: cx + o.x, y: cy + o.y }));
            cells.push(model.run_points(&points, method, Lang::En).outcome.winner);
        }
    }
    cells
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line_model() -> SpatialModel {
        // Ada and Cal at the edges, Bea in the middle.
        SpatialModel {
            candidates: vec![
                SpatialCandidate { name: "Ada".into(), x: 0.15, y: 0.5 },
                SpatialCandidate { name: "Bea".into(), x: 0.5, y: 0.5 },
                SpatialCandidate { name: "Cal".into(), x: 0.85, y: 0.5 },
            ],
            crowds: vec![
                Crowd { x: 0.2, y: 0.5, spread: 0.1, count: 35 },
                Crowd { x: 0.8, y: 0.5, spread: 0.1, count: 33 },
                Crowd { x: 0.5, y: 0.5, spread: 0.1, count: 32 },
            ],
            voters: vec![],
            approval_radius: Some(0.4),
            max_score: 5,
            strategic: 0.0,
        }
    }

    #[test]
    fn crowd_is_a_disc() {
        let crowd = Crowd { x: 0.5, y: 0.5, spread: 0.2, count: 100 };
        let points = crowd.points();
        assert_eq!(points.len(), 100);
        assert!(points.iter().all(|p| p.distance(Point { x: 0.5, y: 0.5 }) <= 0.2 + 1e-9));
    }

    #[test]
    fn center_squeeze_on_the_map() {
        let model = line_model();
        assert_eq!(model.run(Method::Plurality).outcome.winner, 0);
        assert_eq!(model.run(Method::Irv).outcome.winner, 0);
        assert_eq!(model.run(Method::Schulze).outcome.winner, 1);
        assert_eq!(model.run(Method::Borda).outcome.winner, 1);
    }

    #[test]
    fn strategic_plurality_voters_compromise() {
        let mut model = line_model();
        // Make Cal's crowd small: its voters would rather have Bea than Ada.
        model.crowds[1].count = 10;
        model.crowds[2].count = 30;
        assert_eq!(model.run(Method::Plurality).outcome.winner, 0);
        model.strategic = 1.0;
        let result = model.run(Method::Plurality);
        assert_eq!(result.frontrunners, vec![0, 1]);
        assert_eq!(result.outcome.winner, 1);
        assert!(result.votes.iter().any(|v| v.changed));
    }

    #[test]
    fn yee_diagram_follows_the_crowd() {
        let model = line_model();
        let cells = yee(&model, Method::Plurality, 9, 0.1, 30);
        assert_eq!(cells.len(), 81);
        // Middle row: Ada on the left, Bea in the centre, Cal on the right.
        let row = &cells[4 * 9..5 * 9];
        assert_eq!((row[0], row[4], row[8]), (0, 1, 2));
    }
}
