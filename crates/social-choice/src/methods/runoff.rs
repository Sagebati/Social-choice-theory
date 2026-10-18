//! Elimination methods: count, knock someone out, count again.

use super::Method;
use crate::election::{CandidateId, Election};
use crate::outcome::{tiers_by, Outcome, Round};

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

fn names(e: &Election, cs: &[CandidateId]) -> String {
    cs.iter().map(|&c| e.name(c)).collect::<Vec<_>>().join(", ")
}

pub(super) fn two_round(e: &Election) -> Outcome {
    let n = e.num_candidates();
    let total = e.total_weight() as i64;
    let first = count(e, &vec![true; n], top_active);
    let mut round1 = Round::full("Round 1", &first);
    if let Some(w) = (0..n).find(|&c| 2 * first[c] > total) {
        round1 = round1.note(format!("{} has a majority ({} of {}) and wins outright.", e.name(w), first[w], total));
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
    round1 = round1.note(format!("No majority, so {} and {} go to a runoff.", e.name(a), e.name(b)));
    if tiebreak {
        round1 = round1.note("Second place was tied; the tie-break picked the finalist.");
    }

    let (va, vb) = e.duel(a, b);
    let mut tallies = vec![None; n];
    tallies[a] = Some(va as f64);
    tallies[b] = Some(vb as f64);
    let mut round2 = Round::new("Runoff", tallies);
    let mut ranking = if va == vb {
        tiebreak = true;
        round2 = round2.note("The runoff is tied.");
        vec![vec![a.min(b), a.max(b)]]
    } else {
        let (w, l) = if va > vb { (a, b) } else { (b, a) };
        round2.eliminated = vec![l];
        round2 = round2.note(format!("{} wins the runoff against {}.", e.name(w), e.name(l)));
        vec![vec![w], vec![l]]
    };
    ranking.extend(tiers_by(order[2..].iter().copied(), |c| first[c]));
    Outcome::new(Method::TwoRound, ranking, vec![round1, round2], tiebreak)
}

/// Picks who to knock out of a round, given the election, who is still in, their
/// first-choice tallies and the list of remaining candidates. Returns everyone
/// tied for elimination and the reason, to be read after the candidate's name.
type Loser = fn(&Election, &[bool], &[i64], &[CandidateId]) -> (Vec<CandidateId>, String);

/// Shared loop of IRV and Coombs.
fn eliminate_until_majority(e: &Election, method: Method, loser: Loser) -> Outcome {
    let n = e.num_candidates();
    let total = e.total_weight() as i64;
    let mut active = vec![true; n];
    let mut eliminated: Vec<CandidateId> = Vec::new();
    let mut rounds = Vec::new();
    let mut tiebreak = false;
    let (tally, survivors) = loop {
        let tally = count(e, &active, top_active);
        let remaining: Vec<CandidateId> = (0..n).filter(|&c| active[c]).collect();
        let mut round = Round::new(format!("Round {}", rounds.len() + 1), shown(&tally, &active));
        if let Some(&w) = remaining.iter().find(|&&c| 2 * tally[c] > total) {
            round = round.note(format!("{} has a majority ({} of {}).", e.name(w), tally[w], total));
            rounds.push(round);
            break (tally, remaining);
        }
        if remaining.len() == 1 {
            round = round.note(format!("{} is the last one standing.", e.name(remaining[0])));
            rounds.push(round);
            break (tally, remaining);
        }
        let (worst, why) = loser(e, &active, &tally, &remaining);
        if worst.len() == remaining.len() && method == Method::Irv {
            round = round.note(format!("{} are tied, so the count stops here.", names(e, &remaining)));
            rounds.push(round);
            tiebreak = true;
            break (tally, remaining);
        }
        if worst.len() > 1 {
            tiebreak = true;
            round = round.note(format!("{} tie for elimination; the tie-break decides.", names(e, &worst)));
        }
        let out = worst[worst.len() - 1];
        active[out] = false;
        eliminated.push(out);
        round.eliminated.push(out);
        round = round.note(format!("No majority yet. {} {} and is eliminated.", e.name(out), why));
        rounds.push(round);
    };
    let mut ranking = tiers_by(survivors, |c| tally[c]);
    ranking.extend(eliminated.iter().rev().map(|&c| vec![c]));
    Outcome::new(method, ranking, rounds, tiebreak)
}

pub(super) fn irv(e: &Election) -> Outcome {
    eliminate_until_majority(e, Method::Irv, |_, _, tally, remaining| {
        let low = remaining.iter().map(|&c| tally[c]).min().unwrap_or(0);
        let worst = remaining.iter().copied().filter(|&c| tally[c] == low).collect();
        (worst, format!("has the fewest first choices ({low})"))
    })
}

pub(super) fn coombs(e: &Election) -> Outcome {
    eliminate_until_majority(e, Method::Coombs, |e, active, _, remaining| {
        let last = count(e, active, bottom_active);
        let high = remaining.iter().map(|&c| last[c]).max().unwrap_or(0);
        let worst = remaining.iter().copied().filter(|&c| last[c] == high).collect();
        (worst, format!("is ranked last by the most voters ({high})"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn irv_transfers_votes() {
        // Center squeeze: Bea is everyone's compromise but goes out first.
        let e = Election::named(3).with(35, &[0, 1, 2]).with(33, &[2, 1, 0]).with(32, &[1, 0, 2]);
        let out = irv(&e);
        assert_eq!(out.winner, 0);
        assert_eq!(out.rounds.len(), 2);
        assert_eq!(out.rounds[0].eliminated, vec![1]);
        assert_eq!(out.rounds[1].tallies, vec![Some(67.0), None, Some(33.0)]);
        assert_eq!(out.ranking, vec![vec![0], vec![2], vec![1]]);
    }

    #[test]
    fn irv_is_not_monotonic() {
        let before = Election::named(3).with(39, &[0, 1, 2]).with(35, &[1, 2, 0]).with(26, &[2, 0, 1]);
        assert_eq!(irv(&before).winner, 0);
        // Ten Bea voters move Ada to the top of their ballots...
        let after = Election::named(3).with(49, &[0, 1, 2]).with(25, &[1, 2, 0]).with(26, &[2, 0, 1]);
        // ...and Ada loses.
        assert_eq!(irv(&after).winner, 2);
    }

    #[test]
    fn two_round_runoff() {
        let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]);
        let out = two_round(&e);
        assert_eq!(out.winner, 1);
        assert_eq!(out.rounds[1].tallies, vec![Some(40.0), Some(60.0), None]);
    }

    #[test]
    fn coombs_eliminates_most_disliked() {
        let e = Election::named(3).with(35, &[0, 1, 2]).with(33, &[2, 1, 0]).with(32, &[1, 0, 2]);
        // Cal is last on 67 ballots and goes first; Bea then collects the Cal
        // voters' second choices.
        let out = coombs(&e);
        assert_eq!(out.rounds[0].eliminated, vec![2]);
        assert_eq!(out.winner, 1);
    }
}
