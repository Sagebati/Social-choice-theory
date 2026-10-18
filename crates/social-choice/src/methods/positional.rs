//! Positional methods: a ballot gives points by rank.

use super::Method;
use crate::election::Election;
use crate::lang::{tr, Lang};
use crate::outcome::{tiers_by, Outcome, Round};

pub(super) fn plurality(e: &Election, lang: Lang) -> Outcome {
    let mut tally = vec![0i64; e.num_candidates()];
    for b in &e.ballots {
        tally[b.ranking[0]] += i64::from(b.weight);
    }
    let round = Round::full(lang.pick("First-choice votes", "Premiers choix"), &tally).note(lang.pick(
        "Each voter marks one name; the most marks wins.",
        "Chaque électeur coche un seul nom ; le nom le plus coché l’emporte.",
    ));
    Outcome::new(Method::Plurality, tiers_by(0..tally.len(), |c| tally[c]), vec![round], false)
}

pub(super) fn anti_plurality(e: &Election, lang: Lang) -> Outcome {
    let mut vetoes = vec![0i64; e.num_candidates()];
    for b in &e.ballots {
        vetoes[b.ranking[b.ranking.len() - 1]] += i64::from(b.weight);
    }
    let round = Round::full(lang.pick("Vetoes (last places)", "Vetos (dernières places)"), &vetoes).note(lang.pick(
        "Each voter vetoes the candidate they like least; the fewest vetoes wins.",
        "Chaque électeur met son veto sur le candidat qu’il aime le moins ; le moins de vetos l’emporte.",
    ));
    Outcome::new(Method::AntiPlurality, tiers_by(0..vetoes.len(), |c| -vetoes[c]), vec![round], false)
}

pub(super) fn borda(e: &Election, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    let mut points = vec![0i64; n];
    for b in &e.ballots {
        for (p, &c) in b.ranking.iter().enumerate() {
            points[c] += i64::from(b.weight) * (n - 1 - p) as i64;
        }
    }
    let (top, s) = (n - 1, if n == 2 { "" } else { "s" });
    let round = Round::full(lang.pick("Borda points", "Points de Borda"), &points).note(tr!(
        lang,
        "A ballot gives {top} point{s} to its first choice, one fewer to each next choice, and 0 to its last.",
        "Un bulletin donne {top} point{s} à son premier choix, un de moins à chaque choix suivant, et 0 au dernier."
    ));
    Outcome::new(Method::Borda, tiers_by(0..n, |c| points[c]), vec![round], false)
}
