//! Cardinal methods: voters grade candidates instead of ranking them.

use super::Method;
use crate::election::{CandidateId, Election};
use crate::outcome::{tiers_by, Outcome, Round};

pub(super) fn approval(e: &Election) -> Outcome {
    let mut tally = vec![0i64; e.num_candidates()];
    for b in &e.ballots {
        for (c, &approved) in b.approvals.iter().enumerate() {
            if approved {
                tally[c] += i64::from(b.weight);
            }
        }
    }
    let round =
        Round::full("Approvals", &tally).note("Voters approve as many candidates as they like; most approvals wins.");
    Outcome::new(Method::Approval, tiers_by(0..tally.len(), |c| tally[c]), vec![round], false)
}

fn totals(e: &Election) -> Vec<i64> {
    let mut total = vec![0i64; e.num_candidates()];
    for b in &e.ballots {
        for (c, &s) in b.scores.iter().enumerate() {
            total[c] += i64::from(b.weight) * i64::from(s);
        }
    }
    total
}

pub(super) fn score(e: &Election) -> Outcome {
    let total = totals(e);
    let round = Round::full("Total score", &total)
        .note(format!("Each voter scores every candidate from 0 to {}; the highest total wins.", e.max_score));
    Outcome::new(Method::Score, tiers_by(0..total.len(), |c| total[c]), vec![round], false)
}

pub(super) fn star(e: &Election) -> Outcome {
    let n = e.num_candidates();
    let total = totals(e);
    let mut round1 = Round::full("Scoring round", &total);
    if n < 2 {
        return Outcome::new(Method::Star, vec![vec![0]], vec![round1], false);
    }
    let mut order: Vec<CandidateId> = (0..n).collect();
    order.sort_by(|&a, &b| total[b].cmp(&total[a]).then(a.cmp(&b)));
    let (a, b) = (order[0], order[1]);
    let mut tiebreak = n > 2 && total[order[1]] == total[order[2]];
    round1.eliminated = order[2..].to_vec();
    round1 = round1.note(format!("{} and {} have the two highest totals and go to the runoff.", e.name(a), e.name(b)));

    let (mut for_a, mut for_b, mut neither) = (0u64, 0u64, 0u64);
    for ballot in &e.ballots {
        let w = u64::from(ballot.weight);
        match ballot.scores[a].cmp(&ballot.scores[b]) {
            std::cmp::Ordering::Greater => for_a += w,
            std::cmp::Ordering::Less => for_b += w,
            std::cmp::Ordering::Equal => neither += w,
        }
    }
    let mut tallies = vec![None; n];
    tallies[a] = Some(for_a as f64);
    tallies[b] = Some(for_b as f64);
    let mut round2 = Round::new("Automatic runoff", tallies)
        .note("Every ballot counts as one vote for whichever finalist it scored higher.");
    if neither > 0 {
        round2 = round2.note(format!("{neither} ballot(s) scored both finalists equally and sit this round out."));
    }
    // Runoff first; the scoring round settles a tied runoff.
    let key = |c: CandidateId| (if c == a { for_a } else { for_b }, total[c]);
    let mut ranking = if key(a) == key(b) {
        tiebreak = true;
        round2 = round2.note("The runoff and the totals are both tied.");
        vec![vec![a.min(b), a.max(b)]]
    } else {
        let (w, l) = if key(a) > key(b) { (a, b) } else { (b, a) };
        if for_a == for_b {
            round2 = round2.note(format!("The runoff is tied, so the higher total score wins: {}.", e.name(w)));
        } else {
            round2 = round2.note(format!("{} is preferred on more ballots and wins.", e.name(w)));
        }
        round2.eliminated = vec![l];
        vec![vec![w], vec![l]]
    };
    ranking.extend(tiers_by(order[2..].iter().copied(), |c| total[c]));
    Outcome::new(Method::Star, ranking, vec![round1, round2], tiebreak)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::election::Ballot;

    fn ballot(weight: u32, scores: &[u32]) -> Ballot {
        let utilities: Vec<f64> = scores.iter().map(|&s| f64::from(s)).collect();
        let mut b = Ballot::from_utilities(&utilities, 5, None).weighted(weight);
        b.scores = scores.to_vec();
        b
    }

    #[test]
    fn star_runoff_can_overturn_the_top_scorer() {
        let mut e = Election::named(3);
        e.push(ballot(3, &[5, 4, 0]));
        e.push(ballot(2, &[0, 5, 1]));
        e.push(ballot(2, &[5, 0, 1]));
        // Totals: Ada 25, Bea 22, Cal 4. Runoff: Ada is scored higher on 5 ballots, Bea on 2.
        assert_eq!(score(&e).winner, 0);
        assert_eq!(star(&e).winner, 0);
        e.push(ballot(4, &[3, 5, 0]));
        // Totals: Ada 37, Bea 42. Runoff: Ada 5 ballots, Bea 6.
        assert_eq!(score(&e).winner, 1);
        let out = star(&e);
        assert_eq!(out.winner, 1);
        assert_eq!(out.rounds[1].tallies, vec![Some(5.0), Some(6.0), None]);
    }

    #[test]
    fn approval_counts_flags() {
        let e = Election::named(3).with(2, &[0, 1, 2]).with(1, &[2, 1, 0]);
        // With three candidates, ballots built from rankings approve only their top choice.
        assert_eq!(approval(&e).rounds[0].tallies, vec![Some(2.0), Some(0.0), Some(1.0)]);
    }
}
