//! Candidates, ballots and elections.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

/// Index of a candidate inside an [`Election`] (`0..election.candidates.len()`).
pub type CandidateId = usize;

/// Largest number of candidates an election may have. Several analyses enumerate
/// every possible ranking, so the cap keeps them tractable.
pub const MAX_CANDIDATES: usize = 12;

/// Default top of the score scale: score ballots go from 0 to this value.
pub const DEFAULT_MAX_SCORE: u32 = 5;

/// Short names used when an election is generated rather than written by hand.
pub const DEFAULT_NAMES: [&str; MAX_CANDIDATES] =
    ["Ada", "Bea", "Cal", "Dee", "Eli", "Fay", "Gus", "Hal", "Ivy", "Jo", "Kai", "Lou"];

/// Why an election was rejected by [`Election::complete`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    NoCandidates,
    TooManyCandidates(usize),
    BadMaxScore(u32),
    InvalidRanking { ballot: usize },
    WrongLength { ballot: usize },
    ScoreTooHigh { ballot: usize },
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::NoCandidates => write!(f, "an election needs at least one candidate"),
            Error::TooManyCandidates(n) => {
                write!(f, "{n} candidates is more than the supported {MAX_CANDIDATES}")
            }
            Error::BadMaxScore(m) => write!(f, "max_score must be between 1 and 100, got {m}"),
            Error::InvalidRanking { ballot } => {
                write!(f, "ballot {ballot}: the ranking must list every candidate exactly once")
            }
            Error::WrongLength { ballot } => {
                write!(f, "ballot {ballot}: approvals and scores need one entry per candidate")
            }
            Error::ScoreTooHigh { ballot } => write!(f, "ballot {ballot}: a score is above max_score"),
        }
    }
}

impl std::error::Error for Error {}

fn default_weight() -> u32 {
    1
}

fn default_max_score() -> u32 {
    DEFAULT_MAX_SCORE
}

/// What one group of identical voters put in the ballot box.
///
/// Every ballot carries three views of the same opinion so that any method can read
/// it: a full strict `ranking` (best first), one approval flag per candidate and one
/// score per candidate. Each method only looks at the view it needs: plurality reads
/// the top of the ranking, approval voting reads `approvals`, and so on.
///
/// When a ballot arrives with only a ranking, [`Election::complete`] derives the
/// other two views from it (see [`Ballot::from_ranking`]).
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Ballot {
    /// How many voters cast this exact ballot.
    #[serde(default = "default_weight")]
    pub weight: u32,
    /// Every candidate exactly once, most preferred first.
    pub ranking: Vec<CandidateId>,
    /// `approvals[c]` is true when the voter approves of candidate `c`.
    #[serde(default)]
    pub approvals: Vec<bool>,
    /// `scores[c]` is the grade, from 0 to the election's `max_score`, given to `c`.
    #[serde(default)]
    pub scores: Vec<u32>,
}

impl Ballot {
    /// A single voter's ballot built from a ranking.
    ///
    /// The voter approves the top half of the ranking (at least one candidate) and
    /// scores candidates linearly, from `max_score` for the favourite down to 0 for
    /// the last choice.
    pub fn from_ranking(ranking: Vec<CandidateId>, max_score: u32) -> Self {
        let approvals = approvals_from_ranking(&ranking);
        let scores = scores_from_ranking(&ranking, max_score);
        Ballot { weight: 1, ranking, approvals, scores }
    }

    /// A single honest voter's ballot built from how much they like each candidate.
    ///
    /// The ranking sorts candidates by utility (ties go to the lower index), scores
    /// rescale utilities so the favourite gets `max_score` and the least liked gets 0,
    /// and the voter approves every candidate whose utility is at least
    /// `approval_threshold` (the average utility when `None`). The favourite is
    /// always approved, so no approval ballot is empty.
    pub fn from_utilities(utilities: &[f64], max_score: u32, approval_threshold: Option<f64>) -> Self {
        let n = utilities.len();
        let mut ranking: Vec<CandidateId> = (0..n).collect();
        ranking.sort_by(|&a, &b| utilities[b].total_cmp(&utilities[a]).then(a.cmp(&b)));
        let lo = utilities.iter().copied().fold(f64::INFINITY, f64::min);
        let hi = utilities.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let scores = if hi - lo < 1e-12 {
            vec![max_score; n]
        } else {
            utilities.iter().map(|u| ((u - lo) / (hi - lo) * f64::from(max_score)).round() as u32).collect()
        };
        let threshold = approval_threshold.unwrap_or_else(|| utilities.iter().sum::<f64>() / n.max(1) as f64);
        let mut approvals: Vec<bool> = utilities.iter().map(|&u| u >= threshold).collect();
        if let Some(&favourite) = ranking.first() {
            approvals[favourite] = true;
        }
        Ballot { weight: 1, ranking, approvals, scores }
    }

    /// The same ballot cast by `weight` voters.
    pub fn weighted(mut self, weight: u32) -> Self {
        self.weight = weight;
        self
    }

    /// Where `c` sits in the ranking (0 is the top).
    pub fn position(&self, c: CandidateId) -> usize {
        self.ranking.iter().position(|&x| x == c).expect("every candidate appears in a completed ballot")
    }

    /// `positions()[c]` is where candidate `c` sits in the ranking.
    pub fn positions(&self) -> Vec<usize> {
        let mut pos = vec![0; self.ranking.len()];
        for (p, &c) in self.ranking.iter().enumerate() {
            pos[c] = p;
        }
        pos
    }

    /// True when the ranking puts `a` above `b`.
    pub fn prefers(&self, a: CandidateId, b: CandidateId) -> bool {
        self.position(a) < self.position(b)
    }
}

pub(crate) fn approvals_from_ranking(ranking: &[CandidateId]) -> Vec<bool> {
    let n = ranking.len();
    let mut approvals = vec![false; n];
    for &c in ranking.iter().take((n / 2).max(1)) {
        approvals[c] = true;
    }
    approvals
}

pub(crate) fn scores_from_ranking(ranking: &[CandidateId], max_score: u32) -> Vec<u32> {
    let n = ranking.len();
    let mut scores = vec![max_score; n];
    if n > 1 {
        for (p, &c) in ranking.iter().enumerate() {
            let fraction = (n - 1 - p) as f64 / (n - 1) as f64;
            scores[c] = (fraction * f64::from(max_score)).round() as u32;
        }
    }
    scores
}

/// Every strict ranking of `n` candidates (`n!` of them), in lexicographic order.
pub fn all_rankings(n: usize) -> Vec<Vec<CandidateId>> {
    fn extend(prefix: &mut Vec<CandidateId>, used: &mut [bool], out: &mut Vec<Vec<CandidateId>>) {
        if prefix.len() == used.len() {
            out.push(prefix.clone());
            return;
        }
        for c in 0..used.len() {
            if !used[c] {
                used[c] = true;
                prefix.push(c);
                extend(prefix, used, out);
                prefix.pop();
                used[c] = false;
            }
        }
    }
    let mut out = Vec::new();
    extend(&mut Vec::with_capacity(n), &mut vec![false; n], &mut out);
    out
}

fn is_permutation(ranking: &[CandidateId], n: usize) -> bool {
    if ranking.len() != n {
        return false;
    }
    let mut seen = vec![false; n];
    for &c in ranking {
        if c >= n || seen[c] {
            return false;
        }
        seen[c] = true;
    }
    true
}

/// A set of candidates and the ballots cast for them.
///
/// Voting methods assume a *completed* election: every ranking is a permutation
/// of the candidates and every ballot has one approval and one score per candidate.
/// The builder helpers keep that invariant; data from elsewhere should go through
/// [`Election::complete`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Election {
    pub candidates: Vec<String>,
    /// Top of the score scale for score-based methods.
    #[serde(default = "default_max_score")]
    pub max_score: u32,
    pub ballots: Vec<Ballot>,
}

impl Election {
    /// An election between the given candidates, with no ballots yet.
    pub fn new<I, S>(candidates: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        Election {
            candidates: candidates.into_iter().map(Into::into).collect(),
            max_score: DEFAULT_MAX_SCORE,
            ballots: Vec::new(),
        }
    }

    /// An election between the first `n` of [`DEFAULT_NAMES`].
    pub fn named(n: usize) -> Self {
        assert!((1..=MAX_CANDIDATES).contains(&n), "between 1 and {MAX_CANDIDATES} candidates");
        Election::new(DEFAULT_NAMES[..n].iter().copied())
    }

    /// Adds `weight` voters who all rank the candidates in `ranking` order.
    ///
    /// # Panics
    /// When `ranking` is not a permutation of the candidates.
    pub fn with(mut self, weight: u32, ranking: &[CandidateId]) -> Self {
        assert!(
            is_permutation(ranking, self.num_candidates()),
            "ranking {ranking:?} must list every candidate exactly once"
        );
        self.ballots.push(Ballot::from_ranking(ranking.to_vec(), self.max_score).weighted(weight));
        self
    }

    /// Appends a ballot as is.
    pub fn push(&mut self, ballot: Ballot) {
        self.ballots.push(ballot);
    }

    pub fn num_candidates(&self) -> usize {
        self.candidates.len()
    }

    /// Number of voters (the sum of the ballot weights).
    pub fn total_weight(&self) -> u64 {
        self.ballots.iter().map(|b| u64::from(b.weight)).sum()
    }

    pub fn name(&self, c: CandidateId) -> &str {
        &self.candidates[c]
    }

    /// Checks the election and fills in approvals and scores that were left out,
    /// deriving them from each ballot's ranking.
    pub fn complete(mut self) -> Result<Self, Error> {
        let n = self.num_candidates();
        if n == 0 {
            return Err(Error::NoCandidates);
        }
        if n > MAX_CANDIDATES {
            return Err(Error::TooManyCandidates(n));
        }
        if self.max_score == 0 || self.max_score > 100 {
            return Err(Error::BadMaxScore(self.max_score));
        }
        let max_score = self.max_score;
        for (i, b) in self.ballots.iter_mut().enumerate() {
            if !is_permutation(&b.ranking, n) {
                return Err(Error::InvalidRanking { ballot: i });
            }
            if b.approvals.is_empty() {
                b.approvals = approvals_from_ranking(&b.ranking);
            }
            if b.scores.is_empty() {
                b.scores = scores_from_ranking(&b.ranking, max_score);
            }
            if b.approvals.len() != n || b.scores.len() != n {
                return Err(Error::WrongLength { ballot: i });
            }
            if b.scores.iter().any(|&s| s > max_score) {
                return Err(Error::ScoreTooHigh { ballot: i });
            }
        }
        Ok(self)
    }

    /// The same ballots with only the candidates in `keep`, in that order.
    /// Candidate `keep[i]` becomes candidate `i` of the new election.
    pub fn restrict(&self, keep: &[CandidateId]) -> Election {
        let mut new_index = vec![None; self.num_candidates()];
        for (i, &c) in keep.iter().enumerate() {
            new_index[c] = Some(i);
        }
        let ballots = self
            .ballots
            .iter()
            .map(|b| Ballot {
                weight: b.weight,
                ranking: b.ranking.iter().filter_map(|&c| new_index[c]).collect(),
                approvals: keep.iter().map(|&c| b.approvals[c]).collect(),
                scores: keep.iter().map(|&c| b.scores[c]).collect(),
            })
            .collect();
        Election {
            candidates: keep.iter().map(|&c| self.candidates[c].clone()).collect(),
            max_score: self.max_score,
            ballots,
        }
    }

    /// The election with candidate `c` withdrawn. Candidates after `c` shift down
    /// by one index.
    pub fn without(&self, c: CandidateId) -> Election {
        let keep: Vec<CandidateId> = (0..self.num_candidates()).filter(|&x| x != c).collect();
        self.restrict(&keep)
    }

    /// Merges identical ballots, keeping the order in which each first appears.
    pub fn compress(&self) -> Election {
        type Key<'a> = (&'a [CandidateId], &'a [bool], &'a [u32]);
        let mut index: HashMap<Key, usize> = HashMap::new();
        let mut ballots: Vec<Ballot> = Vec::new();
        for b in &self.ballots {
            let key = (b.ranking.as_slice(), b.approvals.as_slice(), b.scores.as_slice());
            match index.get(&key) {
                Some(&i) => ballots[i].weight += b.weight,
                None => {
                    index.insert(key, ballots.len());
                    ballots.push(b.clone());
                }
            }
        }
        Election { candidates: self.candidates.clone(), max_score: self.max_score, ballots }
    }

    /// How many voters rank `a` above `b`, and how many rank `b` above `a`.
    pub fn duel(&self, a: CandidateId, b: CandidateId) -> (u64, u64) {
        let mut for_a = 0;
        let mut for_b = 0;
        for ballot in &self.ballots {
            if ballot.prefers(a, b) {
                for_a += u64::from(ballot.weight);
            } else {
                for_b += u64::from(ballot.weight);
            }
        }
        (for_a, for_b)
    }

    /// The ranking written with candidate names, like `Ada > Bea > Cal`.
    pub fn describe_ranking(&self, ranking: &[CandidateId]) -> String {
        ranking.iter().map(|&c| self.name(c)).collect::<Vec<_>>().join(" > ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn complete_fills_derived_views() {
        let e = Election {
            candidates: vec!["A".into(), "B".into(), "C".into(), "D".into()],
            max_score: 3,
            ballots: vec![Ballot { weight: 2, ranking: vec![2, 0, 3, 1], approvals: vec![], scores: vec![] }],
        }
        .complete()
        .unwrap();
        let b = &e.ballots[0];
        assert_eq!(b.approvals, vec![true, false, true, false]);
        assert_eq!(b.scores, vec![2, 0, 3, 1]);
    }

    #[test]
    fn complete_rejects_bad_rankings() {
        let e = Election::new(["A", "B"]);
        let mut bad = e.clone();
        bad.push(Ballot { weight: 1, ranking: vec![0, 0], approvals: vec![], scores: vec![] });
        assert_eq!(bad.complete(), Err(Error::InvalidRanking { ballot: 0 }));
        let mut short = e;
        short.push(Ballot { weight: 1, ranking: vec![1], approvals: vec![], scores: vec![] });
        assert!(short.complete().is_err());
    }

    #[test]
    fn utilities_make_consistent_ballots() {
        let b = Ballot::from_utilities(&[0.2, 0.9, 0.6], 5, None);
        assert_eq!(b.ranking, vec![1, 2, 0]);
        assert_eq!(b.scores, vec![0, 5, 3]);
        assert_eq!(b.approvals, vec![false, true, true]);
    }

    #[test]
    fn restrict_reindexes() {
        let e = Election::named(3).with(3, &[2, 0, 1]);
        let r = e.without(0);
        assert_eq!(r.candidates, vec!["Bea", "Cal"]);
        assert_eq!(r.ballots[0].ranking, vec![1, 0]);
        assert_eq!(r.ballots[0].scores, vec![0, 5]);
    }

    #[test]
    fn enumerates_rankings() {
        let all = all_rankings(3);
        assert_eq!(all.len(), 6);
        assert_eq!(all[0], vec![0, 1, 2]);
        assert_eq!(all[5], vec![2, 1, 0]);
        assert_eq!(all_rankings(5).len(), 120);
    }

    #[test]
    fn compress_merges_duplicates() {
        let e = Election::named(2).with(1, &[0, 1]).with(2, &[1, 0]).with(3, &[0, 1]);
        let c = e.compress();
        assert_eq!(c.ballots.len(), 2);
        assert_eq!(c.ballots[0].weight, 4);
        assert_eq!(c.total_weight(), 6);
    }
}
