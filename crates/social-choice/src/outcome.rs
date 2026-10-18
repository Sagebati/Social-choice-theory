//! What a voting method returns: a winner, a social ranking and the working.

use crate::election::CandidateId;
use crate::methods::Method;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

/// One step of a count, kept so the result can be explained.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Round {
    pub title: String,
    /// One entry per candidate; `None` once a candidate is out of this round.
    pub tallies: Vec<Option<f64>>,
    /// Candidates knocked out at the end of this round.
    #[serde(default)]
    pub eliminated: Vec<CandidateId>,
    /// Human-readable remarks about the round.
    #[serde(default)]
    pub notes: Vec<String>,
}

impl Round {
    pub(crate) fn new(title: impl Into<String>, tallies: Vec<Option<f64>>) -> Self {
        Round { title: title.into(), tallies, eliminated: Vec::new(), notes: Vec::new() }
    }

    /// A round in which every candidate takes part.
    pub(crate) fn full(title: impl Into<String>, tallies: &[i64]) -> Self {
        Round::new(title, tallies.iter().map(|&t| Some(t as f64)).collect())
    }

    pub(crate) fn note(mut self, note: impl Into<String>) -> Self {
        self.notes.push(note.into());
        self
    }
}

/// The result of running a [`Method`] on an election.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Outcome {
    pub method: Method,
    /// The winner. Ties are broken in favour of the lowest candidate index, and
    /// `used_tiebreak` says when that happened.
    pub winner: CandidateId,
    /// Every candidate sharing first place (just the winner when there is no tie).
    pub tied: Vec<CandidateId>,
    /// The social ranking, best first. Candidates in the same tier are tied.
    pub ranking: Vec<Vec<CandidateId>>,
    /// The working, round by round.
    pub rounds: Vec<Round>,
    /// True when a tie anywhere in the count had to be broken arbitrarily.
    pub used_tiebreak: bool,
}

impl Outcome {
    pub(crate) fn new(method: Method, ranking: Vec<Vec<CandidateId>>, rounds: Vec<Round>, tiebreak: bool) -> Self {
        let tied = ranking[0].clone();
        Outcome { method, winner: tied[0], used_tiebreak: tiebreak || tied.len() > 1, tied, ranking, rounds }
    }

    /// True when the result did not depend on breaking a tie.
    pub fn is_decisive(&self) -> bool {
        !self.used_tiebreak
    }

    /// The tier (0 is best) that holds candidate `c`.
    pub fn tier(&self, c: CandidateId) -> usize {
        self.ranking.iter().position(|tier| tier.contains(&c)).expect("every candidate appears in the social ranking")
    }

    /// How society ranks `a` against `b`: `Greater` when `a` is ranked above `b`.
    pub fn compare(&self, a: CandidateId, b: CandidateId) -> Ordering {
        self.tier(b).cmp(&self.tier(a))
    }

    /// The social ranking flattened into a single order.
    pub fn order(&self) -> Vec<CandidateId> {
        self.ranking.iter().flatten().copied().collect()
    }
}

/// Groups candidates into tiers by descending `key`, lower indices first inside a tier.
pub(crate) fn tiers_by(
    candidates: impl IntoIterator<Item = CandidateId>,
    key: impl Fn(CandidateId) -> i64,
) -> Vec<Vec<CandidateId>> {
    let mut sorted: Vec<CandidateId> = candidates.into_iter().collect();
    sorted.sort_by(|&a, &b| key(b).cmp(&key(a)).then(a.cmp(&b)));
    let mut tiers: Vec<Vec<CandidateId>> = Vec::new();
    for c in sorted {
        match tiers.last_mut() {
            Some(tier) if key(tier[0]) == key(c) => tier.push(c),
            _ => tiers.push(vec![c]),
        }
    }
    tiers
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tiers_group_equal_keys() {
        let scores = [3, 5, 3, 1];
        assert_eq!(tiers_by(0..4, |c| scores[c]), vec![vec![1], vec![0, 2], vec![3]]);
    }
}
