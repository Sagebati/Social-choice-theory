//! The voting methods.
//!
//! Every method is a variant of [`Method`] and is run with [`Method::run`] (or
//! [`Method::run_in`] for the working in another language). All of them are
//! deterministic: whenever a count ties, the candidate with the lowest
//! index is favoured and the outcome records that a tie-break was needed.

use crate::election::Election;
use crate::lang::{tr, Lang};
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
        self.name_in(Lang::En)
    }

    pub fn name_in(self, lang: Lang) -> &'static str {
        match self {
            Method::Plurality => lang.pick("Plurality", "Scrutin à un tour"),
            Method::AntiPlurality => lang.pick("Anti-plurality", "Vote par veto"),
            Method::TwoRound => lang.pick("Two-round runoff", "Scrutin à deux tours"),
            Method::Irv => lang.pick("Instant runoff (IRV)", "Vote alternatif (second tour instantané)"),
            Method::Coombs => lang.pick("Coombs", "Méthode de Coombs"),
            Method::Borda => lang.pick("Borda count", "Méthode de Borda"),
            Method::Agenda => lang.pick("Agenda (sequential pairwise)", "Vote séquentiel (ordre du jour)"),
            Method::Copeland => lang.pick("Copeland", "Méthode de Copeland"),
            Method::Minimax => "Minimax",
            Method::Schulze => lang.pick("Schulze", "Méthode de Schulze"),
            Method::RankedPairs => lang.pick("Ranked pairs", "Paires classées (Tideman)"),
            Method::Approval => lang.pick("Approval", "Vote par approbation"),
            Method::Score => lang.pick("Score (range)", "Vote par notes"),
            Method::Star => "STAR",
            Method::Dictatorship => lang.pick("Dictatorship", "Dictature"),
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

    /// Counts the election, explaining the count in English.
    ///
    /// The election must be complete (see [`Election::complete`]) and have at
    /// least one candidate.
    pub fn run(self, election: &Election) -> Outcome {
        self.run_in(election, Lang::En)
    }

    /// Counts the election, with round titles and notes in `lang`.
    pub fn run_in(self, election: &Election, lang: Lang) -> Outcome {
        let e = election;
        match self {
            Method::Plurality => positional::plurality(e, lang),
            Method::AntiPlurality => positional::anti_plurality(e, lang),
            Method::Borda => positional::borda(e, lang),
            Method::TwoRound => runoff::two_round(e, lang),
            Method::Irv => runoff::irv(e, lang),
            Method::Coombs => runoff::coombs(e, lang),
            Method::Agenda => condorcet::agenda(e, &PairwiseMatrix::new(e), lang),
            Method::Copeland => condorcet::copeland(e, &PairwiseMatrix::new(e), lang),
            Method::Minimax => condorcet::minimax(e, &PairwiseMatrix::new(e), lang),
            Method::Schulze => condorcet::schulze(e, &PairwiseMatrix::new(e), lang),
            Method::RankedPairs => condorcet::ranked_pairs(e, &PairwiseMatrix::new(e), lang),
            Method::Approval => cardinal::approval(e, lang),
            Method::Score => cardinal::score(e, lang),
            Method::Star => cardinal::star(e, lang),
            Method::Dictatorship => dictatorship(e, lang),
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

impl UnknownMethod {
    pub fn message_in(&self, lang: Lang) -> String {
        tr!(lang, "unknown voting method `{}`", "méthode de vote inconnue `{}`", self.0)
    }
}

impl fmt::Display for UnknownMethod {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message_in(Lang::En))
    }
}

impl std::error::Error for UnknownMethod {}

impl FromStr for Method {
    type Err = UnknownMethod;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Method::ALL.into_iter().find(|m| m.id() == s).ok_or_else(|| UnknownMethod(s.to_string()))
    }
}

fn dictatorship(e: &Election, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    match e.ballots.iter().find(|b| b.weight > 0) {
        Some(ballot) => {
            let ranking = e.describe_ranking(&ballot.ranking);
            let note = tr!(
                lang,
                "The first voter ranked {ranking}; that ranking is the result, whatever anyone else thinks.",
                "Le premier électeur a voté {ranking} ; ce classement est le résultat, quoi qu’en pensent les autres."
            );
            let title = lang.pick("The dictator's ballot", "Le bulletin du dictateur");
            let round = Round::new(title, vec![None; n]).note(note);
            Outcome::new(Method::Dictatorship, ballot.ranking.iter().map(|&c| vec![c]).collect(), vec![round], false)
        }
        None => {
            let round = Round::new(lang.pick("No ballots", "Aucun bulletin"), vec![None; n])
                .note(lang.pick("Nobody voted, so everyone ties.", "Personne n’a voté : tout le monde est à égalité."));
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

    #[test]
    fn french_counts_are_the_same_counts_in_other_words() {
        let elections = [
            crate::scenarios::riverton().complete().unwrap(),
            Election::named(3).with(4, &[0, 1, 2]).with(3, &[1, 2, 0]).with(2, &[2, 0, 1]).complete().unwrap(),
            Election::named(3),
        ];
        for e in &elections {
            for m in Method::ALL {
                let (en, fr) = (m.run(e), m.run_in(e, Lang::Fr));
                assert_eq!((en.winner, &en.ranking, en.used_tiebreak), (fr.winner, &fr.ranking, fr.used_tiebreak));
                for (a, b) in en.rounds.iter().zip(&fr.rounds) {
                    assert_eq!((&a.tallies, &a.eliminated), (&b.tallies, &b.eliminated), "{m}");
                    assert!(a.title != b.title || m == Method::Minimax || m == Method::Star, "{m}: {}", b.title);
                    assert_eq!(a.notes.len(), b.notes.len(), "{m}");
                    for (x, y) in a.notes.iter().zip(&b.notes) {
                        assert_ne!(x, y, "{m}: untranslated note");
                    }
                }
            }
        }
        let two_round = Method::TwoRound.run_in(&elections[0], Lang::Fr);
        assert_eq!(two_round.rounds[1].title, "Second tour");
        assert_eq!(two_round.rounds[1].notes, ["Amira remporte le second tour face à Erik."]);
        assert_eq!(Method::Irv.name_in(Lang::Fr), "Vote alternatif (second tour instantané)");
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
