//! Condorcet methods: built on head-to-head comparisons. All of them elect the
//! Condorcet winner whenever there is one; they differ in how they break cycles.

use super::Method;
use crate::election::{CandidateId, Election};
use crate::lang::{tr, Lang};
use crate::outcome::{tiers_by, Outcome, Round};
use crate::pairwise::PairwiseMatrix;

pub(super) fn agenda(e: &Election, pm: &PairwiseMatrix, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    let mut champion = 0;
    let mut knocked_out = Vec::new();
    let mut duels_won = vec![0i64; n];
    let mut tiebreak = false;
    let mut round = Round::new(lang.pick("Duels in agenda order", "Duels dans l’ordre du jour"), vec![None; n]);
    for challenger in 1..n {
        let (c, d) = (pm.prefer(champion, challenger), pm.prefer(challenger, champion));
        let (holder, newcomer) = (e.name(champion), e.name(challenger));
        if d > c {
            round.notes.push(tr!(lang, "{newcomer} beats {holder} ({d}–{c}).", "{newcomer} bat {holder} ({d}–{c})."));
            knocked_out.push(champion);
            champion = challenger;
        } else {
            if c == d {
                tiebreak = true;
                round.notes.push(tr!(
                    lang,
                    "{holder} and {newcomer} tie ({c}–{d}); the sitting champion stays.",
                    "{holder} et {newcomer} font match nul ({c}–{d}) ; {holder}, déjà en place, reste en lice."
                ));
            } else {
                round.notes.push(tr!(
                    lang,
                    "{holder} beats {newcomer} ({c}–{d}).",
                    "{holder} bat {newcomer} ({c}–{d})."
                ));
            }
            knocked_out.push(challenger);
        }
        duels_won[champion] += 1;
    }
    round.tallies = duels_won.iter().map(|&w| Some(w as f64)).collect();
    let last = e.name(champion);
    round.notes.push(tr!(lang, "{last} survives the agenda.", "{last} l’emporte au bout de l’ordre du jour."));
    let mut ranking = vec![vec![champion]];
    ranking.extend(knocked_out.iter().rev().map(|&c| vec![c]));
    Outcome::new(Method::Agenda, ranking, vec![round], tiebreak)
}

pub(super) fn copeland(e: &Election, pm: &PairwiseMatrix, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    // Doubled so a tie can count as half a win without fractions.
    let doubled: Vec<i64> =
        (0..n).map(|a| (0..n).filter(|&b| b != a).map(|b| 1 + pm.margin(a, b).signum()).sum()).collect();
    let scores = doubled.iter().map(|&s| Some(s as f64 / 2.0)).collect();
    let round = Round::new(lang.pick("Copeland score", "Score de Copeland"), scores).note(lang.pick(
        "One point for every head-to-head win and half a point for every tie.",
        "Un point par duel gagné, un demi-point par duel nul.",
    ));
    Outcome::new(Method::Copeland, tiers_by(0..n, |c| doubled[c]), vec![round], false)
}

pub(super) fn minimax(e: &Election, pm: &PairwiseMatrix, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    let worst: Vec<i64> =
        (0..n).map(|a| (0..n).filter(|&b| b != a).map(|b| pm.margin(b, a)).max().unwrap_or(0)).collect();
    let defeats = worst.iter().map(|&w| Some(w as f64)).collect();
    let round = Round::new(lang.pick("Worst head-to-head defeat", "Pire défaite en duel"), defeats).note(lang.pick(
        "Each candidate is judged by their heaviest defeat (the margin they lose by; negative when they win \
         every duel). The smallest worst defeat wins.",
        "Chaque candidat est jugé sur sa plus lourde défaite (l’écart de voix du duel perdu ; négatif s’il gagne \
         tous ses duels). La pire défaite la plus légère l’emporte.",
    ));
    Outcome::new(Method::Minimax, tiers_by(0..n, |c| -worst[c]), vec![round], false)
}

#[allow(clippy::needless_range_loop)]
pub(super) fn schulze(e: &Election, pm: &PairwiseMatrix, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    // p[a][b]: strength of the strongest beatpath from a to b, where a path is as
    // strong as its weakest link and a link a→b is a's vote count when a beats b.
    let mut p = vec![vec![0u64; n]; n];
    for a in 0..n {
        for b in 0..n {
            if a != b && pm.beats(a, b) {
                p[a][b] = pm.prefer(a, b);
            }
        }
    }
    for k in 0..n {
        for i in 0..n {
            if i == k {
                continue;
            }
            for j in 0..n {
                if j != i && j != k {
                    p[i][j] = p[i][j].max(p[i][k].min(p[k][j]));
                }
            }
        }
    }
    let wins: Vec<i64> = (0..n).map(|a| (0..n).filter(|&b| p[a][b] > p[b][a]).count() as i64).collect();
    let unbeaten = (0..n).filter(|&a| (0..n).all(|b| p[b][a] <= p[a][b])).count();
    let ranking = tiers_by(0..n, |c| wins[c]);
    let top = ranking[0][0];
    let tally = wins.iter().map(|&w| Some(w as f64)).collect();
    let mut round = Round::new(lang.pick("Beatpath wins", "Victoires par chemins"), tally).note(lang.pick(
        "Each candidate counts the rivals they beat through their strongest chain of head-to-head wins.",
        "Chaque candidat compte les rivaux qu’il bat par sa plus forte chaîne de victoires en duel.",
    ));
    for b in (0..n).filter(|&b| b != top) {
        let (x, y, forward, back) = (e.name(top), e.name(b), p[top][b], p[b][top]);
        round.notes.push(tr!(
            lang,
            "Strongest path {x} → {y}: {forward}; {y} → {x}: {back}.",
            "Chemin le plus fort {x} → {y} : {forward} ; {y} → {x} : {back}."
        ));
    }
    Outcome::new(Method::Schulze, ranking, vec![round], unbeaten > 1)
}

fn reaches(locked: &[Vec<bool>], from: CandidateId, to: CandidateId) -> bool {
    let mut stack = vec![from];
    let mut seen = vec![false; locked.len()];
    while let Some(a) = stack.pop() {
        if a == to {
            return true;
        }
        if !std::mem::replace(&mut seen[a], true) {
            stack.extend((0..locked.len()).filter(|&b| locked[a][b]));
        }
    }
    false
}

pub(super) fn ranked_pairs(e: &Election, pm: &PairwiseMatrix, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    let mut pairs: Vec<(CandidateId, CandidateId)> =
        (0..n).flat_map(|a| (0..n).map(move |b| (a, b))).filter(|&(a, b)| a != b && pm.beats(a, b)).collect();
    // Strongest majority first; among equal majorities, the one with less opposition.
    let strength = |&(a, b): &(CandidateId, CandidateId)| (pm.prefer(a, b), std::cmp::Reverse(pm.prefer(b, a)));
    pairs.sort_by(|x, y| strength(y).cmp(&strength(x)).then(x.cmp(y)));

    let mut locked = vec![vec![false; n]; n];
    let mut round = Round::new(lang.pick("Locking in majorities", "Verrouillage des majorités"), vec![None; n]);
    let mut tiebreak = false;
    for group in pairs.chunk_by(|x, y| strength(x) == strength(y)) {
        // Equally strong majorities are only a real tie if the order they are
        // locked in matters, i.e. locking all the acceptable ones would make a cycle.
        if group.len() > 1 {
            let mut trial = locked.clone();
            for &(a, b) in group.iter().filter(|&&(a, b)| !reaches(&locked, b, a)) {
                trial[a][b] = true;
            }
            tiebreak |= group.iter().any(|&(a, b)| trial[a][b] && reaches(&trial, b, a));
        }
        for &(a, b) in group {
            let (x, y, for_x, for_y) = (e.name(a), e.name(b), pm.prefer(a, b), pm.prefer(b, a));
            let result = tr!(lang, "{x} over {y} ({for_x}–{for_y})", "{x} devant {y} ({for_x}–{for_y})");
            if reaches(&locked, b, a) {
                round.notes.push(tr!(
                    lang,
                    "Skip {result}: it would close a cycle.",
                    "On écarte {result} : cela fermerait un cycle."
                ));
            } else {
                locked[a][b] = true;
                round.notes.push(tr!(lang, "Lock {result}.", "On verrouille {result}."));
            }
        }
    }
    round.tallies = (0..n).map(|a| Some(locked[a].iter().filter(|&&l| l).count() as f64)).collect();

    // Peel off the candidates nobody left is locked above.
    let mut left: Vec<CandidateId> = (0..n).collect();
    let mut ranking = Vec::new();
    while !left.is_empty() {
        let tier: Vec<CandidateId> = left.iter().copied().filter(|&c| !left.iter().any(|&d| locked[d][c])).collect();
        left.retain(|c| !tier.contains(c));
        ranking.push(tier);
    }
    Outcome::new(Method::RankedPairs, ranking, vec![round], tiebreak)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paradox() -> Election {
        Election::named(3).with(4, &[0, 1, 2]).with(3, &[1, 2, 0]).with(2, &[2, 0, 1])
    }

    #[test]
    fn cycle_resolution() {
        // Ada > Bea 6–3, Bea > Cal 7–2, Cal > Ada 5–4: the weakest link is Cal > Ada.
        let e = paradox();
        let pm = PairwiseMatrix::new(&e);
        assert_eq!(ranked_pairs(&e, &pm, Lang::En).order(), vec![0, 1, 2]);
        assert_eq!(schulze(&e, &pm, Lang::En).winner, 0);
        assert_eq!(minimax(&e, &pm, Lang::En).winner, 0);
        let copeland = copeland(&e, &pm, Lang::En);
        assert_eq!(copeland.tied, vec![0, 1, 2]);
    }

    #[test]
    fn agenda_order_decides_cycles() {
        // In a cycle, whoever enters the agenda last wins.
        let e = paradox();
        assert_eq!(agenda(&e, &PairwiseMatrix::new(&e), Lang::En).winner, 2);
        let reordered = e.restrict(&[2, 0, 1]);
        let w = agenda(&reordered, &PairwiseMatrix::new(&reordered), Lang::En).winner;
        assert_eq!(reordered.name(w), "Bea");
    }
}
