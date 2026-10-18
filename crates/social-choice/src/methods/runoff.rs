//! Elimination methods: count, knock someone out, count again.

use super::Method;
use crate::election::{CandidateId, Election};
use crate::lang::{tr, Lang};
use crate::outcome::{tiers_by, Outcome, Round};
use crate::text::{fr_que, join_in};

fn top_active(ranking: &[CandidateId], active: &[bool]) -> Option<CandidateId> {
    ranking.iter().copied().find(|&c| active[c])
}

fn bottom_active(ranking: &[CandidateId], active: &[bool]) -> Option<CandidateId> {
    ranking.iter().rev().copied().find(|&c| active[c])
}

/// For each candidate still in the race, the weight of ballots whose `pick` they are.
fn count(e: &Election, active: &[bool], pick: fn(&[CandidateId], &[bool]) -> Option<CandidateId>) -> Vec<i64> {
    let mut tally = vec![0i64; e.num_candidates()];
    for b in &e.ballots {
        if let Some(c) = pick(&b.ranking, active) {
            tally[c] += i64::from(b.weight);
        }
    }
    tally
}

fn shown(tally: &[i64], active: &[bool]) -> Vec<Option<f64>> {
    tally.iter().zip(active).map(|(&t, &a)| a.then_some(t as f64)).collect()
}

/// `Ada, Bea` in English, `Ada et Bea` in French.
fn names(e: &Election, cs: &[CandidateId], lang: Lang) -> String {
    match lang {
        Lang::En => cs.iter().map(|&c| e.name(c)).collect::<Vec<_>>().join(", "),
        Lang::Fr => join_in(e, cs, lang),
    }
}

pub(super) fn two_round(e: &Election, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    let total = e.total_weight() as i64;
    let first = count(e, &vec![true; n], top_active);
    let mut round1 = Round::full(lang.pick("Round 1", "Premier tour"), &first);
    if let Some(w) = (0..n).find(|&c| 2 * first[c] > total) {
        let (name, votes) = (e.name(w), first[w]);
        round1 = round1.note(tr!(
            lang,
            "{name} has a majority ({votes} of {total}) and wins outright.",
            "{name} obtient la majorité absolue ({votes} sur {total}) et l’emporte dès le premier tour."
        ));
        return Outcome::new(Method::TwoRound, tiers_by(0..n, |c| first[c]), vec![round1], false);
    }
    if n < 2 {
        return Outcome::new(Method::TwoRound, tiers_by(0..n, |c| first[c]), vec![round1], false);
    }
    let mut order: Vec<CandidateId> = (0..n).collect();
    order.sort_by(|&a, &b| first[b].cmp(&first[a]).then(a.cmp(&b)));
    let (a, b) = (order[0], order[1]);
    let mut tiebreak = n > 2 && first[order[1]] == first[order[2]];
    round1.eliminated = order[2..].to_vec();
    round1 = round1.note(tr!(
        lang,
        "No majority, so {} and {} go to a runoff.",
        "Personne n’a la majorité absolue : {} et {} se qualifient pour le second tour.",
        e.name(a),
        e.name(b)
    ));
    if tiebreak {
        round1 = round1.note(lang.pick(
            "Second place was tied; the tie-break picked the finalist.",
            "Égalité pour la deuxième place : le départage a désigné le finaliste.",
        ));
    }

    let (va, vb) = e.duel(a, b);
    let mut tallies = vec![None; n];
    tallies[a] = Some(va as f64);
    tallies[b] = Some(vb as f64);
    let mut round2 = Round::new(lang.pick("Runoff", "Second tour"), tallies);
    let mut ranking = if va == vb {
        tiebreak = true;
        round2 = round2.note(lang.pick("The runoff is tied.", "Le second tour est à égalité."));
        vec![vec![a.min(b), a.max(b)]]
    } else {
        let (w, l) = if va > vb { (a, b) } else { (b, a) };
        round2.eliminated = vec![l];
        round2 = round2.note(tr!(
            lang,
            "{} wins the runoff against {}.",
            "{} remporte le second tour face à {}.",
            e.name(w),
            e.name(l)
        ));
        vec![vec![w], vec![l]]
    };
    ranking.extend(tiers_by(order[2..].iter().copied(), |c| first[c]));
    Outcome::new(Method::TwoRound, ranking, vec![round1, round2], tiebreak)
}

/// Picks who to knock out of a round, given the election, who is still in, their
/// first-choice tallies and the list of remaining candidates. Returns everyone
/// tied for elimination and the reason, to be read after the candidate's name.
type Loser = fn(&Election, &[bool], &[i64], &[CandidateId], Lang) -> (Vec<CandidateId>, String);

/// Shared loop of IRV and Coombs.
fn eliminate_until_majority(e: &Election, method: Method, loser: Loser, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    let total = e.total_weight() as i64;
    let mut active = vec![true; n];
    let mut eliminated: Vec<CandidateId> = Vec::new();
    let mut rounds = Vec::new();
    let mut tiebreak = false;
    let (tally, survivors) = loop {
        let tally = count(e, &active, top_active);
        let remaining: Vec<CandidateId> = (0..n).filter(|&c| active[c]).collect();
        let number = rounds.len() + 1;
        let mut round = Round::new(tr!(lang, "Round {number}", "Tour {number}"), shown(&tally, &active));
        if let Some(&w) = remaining.iter().find(|&&c| 2 * tally[c] > total) {
            let (name, votes) = (e.name(w), tally[w]);
            round = round.note(tr!(
                lang,
                "{name} has a majority ({votes} of {total}).",
                "{name} obtient la majorité absolue ({votes} sur {total})."
            ));
            rounds.push(round);
            break (tally, remaining);
        }
        if remaining.len() == 1 {
            let name = e.name(remaining[0]);
            round = round.note(match lang {
                Lang::En => format!("{name} is the last one standing."),
                Lang::Fr => format!("Il ne reste plus {}.", fr_que(name)),
            });
            rounds.push(round);
            break (tally, remaining);
        }
        let (worst, why) = loser(e, &active, &tally, &remaining, lang);
        if worst.len() == remaining.len() && method == Method::Irv {
            let tied = names(e, &remaining, lang);
            round = round.note(tr!(
                lang,
                "{tied} are tied, so the count stops here.",
                "{tied} sont à égalité : le décompte s’arrête là."
            ));
            rounds.push(round);
            tiebreak = true;
            break (tally, remaining);
        }
        if worst.len() > 1 {
            tiebreak = true;
            let tied = names(e, &worst, lang);
            round = round.note(tr!(
                lang,
                "{tied} tie for elimination; the tie-break decides.",
                "{tied} sont à égalité pour l’élimination ; le départage tranche."
            ));
        }
        let out = worst[worst.len() - 1];
        active[out] = false;
        eliminated.push(out);
        round.eliminated.push(out);
        let name = e.name(out);
        round = round.note(tr!(
            lang,
            "No majority yet. {name} {why} and is eliminated.",
            "Toujours pas de majorité absolue. {name} {why} et sort de la course."
        ));
        rounds.push(round);
    };
    let mut ranking = tiers_by(survivors, |c| tally[c]);
    ranking.extend(eliminated.iter().rev().map(|&c| vec![c]));
    Outcome::new(method, ranking, rounds, tiebreak)
}

pub(super) fn irv(e: &Election, lang: Lang) -> Outcome {
    let loser: Loser = |_, _, tally, remaining, lang| {
        let low = remaining.iter().map(|&c| tally[c]).min().unwrap_or(0);
        let worst = remaining.iter().copied().filter(|&c| tally[c] == low).collect();
        (worst, tr!(lang, "has the fewest first choices ({low})", "a le moins de premiers choix ({low})"))
    };
    eliminate_until_majority(e, Method::Irv, loser, lang)
}

pub(super) fn coombs(e: &Election, lang: Lang) -> Outcome {
    let loser: Loser = |e, active, _, remaining, lang| {
        let last = count(e, active, bottom_active);
        let high = remaining.iter().map(|&c| last[c]).max().unwrap_or(0);
        let worst = remaining.iter().copied().filter(|&c| last[c] == high).collect();
        (worst, tr!(lang, "is ranked last by the most voters ({high})", "a le plus de dernières places ({high})"))
    };
    eliminate_until_majority(e, Method::Coombs, loser, lang)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn irv_transfers_votes() {
        // Center squeeze: Bea is everyone's compromise but goes out first.
        let e = Election::named(3).with(35, &[0, 1, 2]).with(33, &[2, 1, 0]).with(32, &[1, 0, 2]);
        let out = irv(&e, Lang::En);
        assert_eq!(out.winner, 0);
        assert_eq!(out.rounds.len(), 2);
        assert_eq!(out.rounds[0].eliminated, vec![1]);
        assert_eq!(out.rounds[1].tallies, vec![Some(67.0), None, Some(33.0)]);
        assert_eq!(out.ranking, vec![vec![0], vec![2], vec![1]]);
    }

    #[test]
    fn irv_is_not_monotonic() {
        let before = Election::named(3).with(39, &[0, 1, 2]).with(35, &[1, 2, 0]).with(26, &[2, 0, 1]);
        assert_eq!(irv(&before, Lang::En).winner, 0);
        // Ten Bea voters move Ada to the top of their ballots...
        let after = Election::named(3).with(49, &[0, 1, 2]).with(25, &[1, 2, 0]).with(26, &[2, 0, 1]);
        // ...and Ada loses.
        assert_eq!(irv(&after, Lang::En).winner, 2);
    }

    #[test]
    fn two_round_runoff() {
        let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]);
        let out = two_round(&e, Lang::En);
        assert_eq!(out.winner, 1);
        assert_eq!(out.rounds[1].tallies, vec![Some(40.0), Some(60.0), None]);
    }

    #[test]
    fn coombs_eliminates_most_disliked() {
        let e = Election::named(3).with(35, &[0, 1, 2]).with(33, &[2, 1, 0]).with(32, &[1, 0, 2]);
        // Cal is last on 67 ballots and goes first; Bea then collects the Cal
        // voters' second choices.
        let out = coombs(&e, Lang::En);
        assert_eq!(out.rounds[0].eliminated, vec![2]);
        assert_eq!(out.winner, 1);
    }
}
