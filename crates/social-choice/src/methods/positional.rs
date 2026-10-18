//! Positional methods: a ballot gives points by rank.

use super::Method;
use crate::election::Election;
use crate::outcome::{tiers_by, Outcome, Round};

pub(super) fn plurality(e: &Election) -> Outcome {
    let mut tally = vec![0i64; e.num_candidates()];
    for b in &e.ballots {
        tally[b.ranking[0]] += i64::from(b.weight);
    }
    let round = Round::full("First-choice votes", &tally).note("Each voter marks one name; the most marks wins.");
    Outcome::new(Method::Plurality, tiers_by(0..tally.len(), |c| tally[c]), vec![round], false)
}

pub(super) fn anti_plurality(e: &Election) -> Outcome {
    let mut vetoes = vec![0i64; e.num_candidates()];
    for b in &e.ballots {
        vetoes[b.ranking[b.ranking.len() - 1]] += i64::from(b.weight);
    }
    let round = Round::full("Vetoes (last places)", &vetoes)
        .note("Each voter vetoes the candidate they like least; the fewest vetoes wins.");
    Outcome::new(Method::AntiPlurality, tiers_by(0..vetoes.len(), |c| -vetoes[c]), vec![round], false)
}

pub(super) fn borda(e: &Election) -> Outcome {
    let n = e.num_candidates();
    let mut points = vec![0i64; n];
    for b in &e.ballots {
        for (p, &c) in b.ranking.iter().enumerate() {
            points[c] += i64::from(b.weight) * (n - 1 - p) as i64;
        }
    }
    let round = Round::full("Borda points", &points).note(format!(
        "A ballot gives {} point{} to its first choice, one fewer to each next choice, and 0 to its last.",
        n - 1,
        if n == 2 { "" } else { "s" }
    ));
    Outcome::new(Method::Borda, tiers_by(0..n, |c| points[c]), vec![round], false)
}
