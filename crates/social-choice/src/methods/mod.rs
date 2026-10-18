//! The voting methods.
//!
//! Every method is a variant of [`Method`] and is run with [`Method::run`]. All of
//! them are deterministic: whenever a count ties, the candidate with the lowest
//! index is favoured and the outcome records that a tie-break was needed.

use crate::election::Election;
use crate::outcome::{Outcome, Round};
use crate::pairwise::PairwiseMatrix;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

mod cardinal;
mod condorcet;
mod positional;
mod runoff;

/// A rule that turns ballots into a winner and a social ranking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Method {
    /// Most first choices wins ("first past the post").
    Plurality,
    /// Everyone vetoes their last choice; fewest vetoes wins.
    AntiPlurality,
    /// Top two by first choices go to a head-to-head runoff.
    TwoRound,
    /// Instant-runoff voting: repeatedly eliminate the candidate with the fewest
    /// first choices.
    Irv,
    /// Like IRV, but eliminate the candidate with the most last places.
    Coombs,
    /// Points by rank: n-1 for a first choice down to 0 for the last.
    Borda,
    /// Sequential pairwise duels in the order the candidates are listed.
    Agenda,
    /// Most head-to-head wins (a tie counts as half a win).
    Copeland,
    /// Smallest worst head-to-head defeat (by margin).
    Minimax,
    /// Schulze's beatpath method.
    Schulze,
    /// Tideman's ranked pairs: lock in the strongest majorities unless they make a cycle.
    RankedPairs,
    /// Most approvals wins.
    Approval,
    /// Highest total score wins.
    Score,
    /// Score Then Automatic Runoff between the two highest scorers.
    Star,
    /// The first ballot decides everything.
    Dictatorship,
}

/// The part of a ballot a method reads.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BallotKind {
    /// Only the first choice of the ranking matters.
    ChooseOne,
    /// Only the last choice of the ranking matters.
    Veto,
    /// The whole ranking matters.
    Ranked,
    /// The approval flags.
    Approval,
    /// The scores.
    Score,
}

/// Broad families of methods, used to group them in explanations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Family {
    Positional,
    Runoff,
    Condorcet,
    Cardinal,
    Degenerate,
}

impl Method {
    pub const ALL: [Method; 15] = [
        Method::Plurality,
        Method::AntiPlurality,
        Method::TwoRound,
        Method::Irv,
        Method::Coombs,
        Method::Borda,
        Method::Agenda,
        Method::Copeland,
        Method::Minimax,
        Method::Schulze,
        Method::RankedPairs,
        Method::Approval,
        Method::Score,
        Method::Star,
        Method::Dictatorship,
    ];

    /// The identifier used in JSON and URLs.
    pub fn id(self) -> &'static str {
        match self {
            Method::Plurality => "plurality",
            Method::AntiPlurality => "anti_plurality",
            Method::TwoRound => "two_round",
            Method::Irv => "irv",
            Method::Coombs => "coombs",
            Method::Borda => "borda",
            Method::Agenda => "agenda",
            Method::Copeland => "copeland",
            Method::Minimax => "minimax",
            Method::Schulze => "schulze",
            Method::RankedPairs => "ranked_pairs",
            Method::Approval => "approval",
            Method::Score => "score",
            Method::Star => "star",
            Method::Dictatorship => "dictatorship",
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Method::Plurality => "Plurality",
            Method::AntiPlurality => "Anti-plurality",
            Method::TwoRound => "Two-round runoff",
            Method::Irv => "Instant runoff (IRV)",
            Method::Coombs => "Coombs",
            Method::Borda => "Borda count",
            Method::Agenda => "Agenda (sequential pairwise)",
            Method::Copeland => "Copeland",
            Method::Minimax => "Minimax",
            Method::Schulze => "Schulze",
            Method::RankedPairs => "Ranked pairs",
            Method::Approval => "Approval",
            Method::Score => "Score (range)",
            Method::Star => "STAR",
            Method::Dictatorship => "Dictatorship",
        }
    }

    pub fn ballot_kind(self) -> BallotKind {
        match self {
            Method::Plurality => BallotKind::ChooseOne,
            Method::AntiPlurality => BallotKind::Veto,
            Method::Approval => BallotKind::Approval,
            Method::Score | Method::Star => BallotKind::Score,
            _ => BallotKind::Ranked,
        }
    }

    pub fn family(self) -> Family {
        match self {
            Method::Plurality | Method::AntiPlurality | Method::Borda => Family::Positional,
            Method::TwoRound | Method::Irv | Method::Coombs => Family::Runoff,
            Method::Agenda | Method::Copeland | Method::Minimax | Method::Schulze | Method::RankedPairs => {
                Family::Condorcet
            }
            Method::Approval | Method::Score | Method::Star => Family::Cardinal,
            Method::Dictatorship => Family::Degenerate,
        }
    }

    /// Counts the election.
    ///
    /// The election must be complete (see [`Election::complete`]) and have at
    /// least one candidate.
    pub fn run(self, election: &Election) -> Outcome {
        match self {
            Method::Plurality => positional::plurality(election),
            Method::AntiPlurality => positional::anti_plurality(election),
            Method::Borda => positional::borda(election),
            Method::TwoRound => runoff::two_round(election),
            Method::Irv => runoff::irv(election),
            Method::Coombs => runoff::coombs(election),
            Method::Agenda => condorcet::agenda(election, &PairwiseMatrix::new(election)),
            Method::Copeland => condorcet::copeland(election, &PairwiseMatrix::new(election)),
            Method::Minimax => condorcet::minimax(election, &PairwiseMatrix::new(election)),
            Method::Schulze => condorcet::schulze(election, &PairwiseMatrix::new(election)),
            Method::RankedPairs => condorcet::ranked_pairs(election, &PairwiseMatrix::new(election)),
            Method::Approval => cardinal::approval(election),
            Method::Score => cardinal::score(election),
            Method::Star => cardinal::star(election),
            Method::Dictatorship => dictatorship(election),
        }
    }
}

impl fmt::Display for Method {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.name())
    }
}

/// Error for an unknown method identifier.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnknownMethod(pub String);

impl fmt::Display for UnknownMethod {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "unknown voting method `{}`", self.0)
    }
}

impl std::error::Error for UnknownMethod {}

impl FromStr for Method {
    type Err = UnknownMethod;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Method::ALL.into_iter().find(|m| m.id() == s).ok_or_else(|| UnknownMethod(s.to_string()))
    }
}

fn dictatorship(e: &Election) -> Outcome {
    let n = e.num_candidates();
    match e.ballots.iter().find(|b| b.weight > 0) {
        Some(ballot) => {
            let round = Round::new("The dictator's ballot", vec![None; n]).note(format!(
                "The first voter ranked {}; that ranking is the result, whatever anyone else thinks.",
                e.describe_ranking(&ballot.ranking)
            ));
            Outcome::new(Method::Dictatorship, ballot.ranking.iter().map(|&c| vec![c]).collect(), vec![round], false)
        }
        None => {
            let round = Round::new("No ballots", vec![None; n]).note("Nobody voted, so everyone ties.");
            Outcome::new(Method::Dictatorship, vec![(0..n).collect()], vec![round], true)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_round_trip_through_serde_and_from_str() {
        for m in Method::ALL {
            let json = serde_json::to_string(&m).unwrap();
            assert_eq!(json, format!("\"{}\"", m.id()));
            assert_eq!(m.id().parse::<Method>().unwrap(), m);
        }
        assert!("nope".parse::<Method>().is_err());
    }

    #[test]
    fn every_method_handles_a_single_candidate_and_no_ballots() {
        let one = Election::named(1).with(3, &[0]);
        let empty = Election::named(3);
        for m in Method::ALL {
            assert_eq!(m.run(&one).winner, 0, "{m}");
            let out = m.run(&empty);
            assert!(out.used_tiebreak, "{m} should flag the empty tie");
            assert_eq!(out.order().len(), 3, "{m}");
        }
    }

    /// The spoiler election from the scenarios: every method's winner, written
    /// out by hand.
    #[test]
    fn known_winners() {
        let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]);
        let expect = [
            (Method::Plurality, 0),
            (Method::AntiPlurality, 1),
            (Method::TwoRound, 1),
            (Method::Irv, 1),
            (Method::Coombs, 1),
            (Method::Borda, 1),
            (Method::Agenda, 1),
            (Method::Copeland, 1),
            (Method::Minimax, 1),
            (Method::Schulze, 1),
            (Method::RankedPairs, 1),
            (Method::Dictatorship, 0),
        ];
        for (m, w) in expect {
            let out = m.run(&e);
            assert_eq!(out.winner, w, "{m}");
            assert!(out.is_decisive(), "{m}");
        }
    }
}
