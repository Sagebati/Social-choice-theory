//! Cardinal methods: voters grade candidates instead of ranking them.

use super::Method;
use crate::election::{CandidateId, Election};
use crate::lang::{tr, Lang};
use crate::outcome::{tiers_by, Outcome, Round};

pub(super) fn approval(e: &Election, lang: Lang) -> Outcome {
    let mut tally = vec![0i64; e.num_candidates()];
    for b in &e.ballots {
        for (c, &approved) in b.approvals.iter().enumerate() {
            if approved {
                tally[c] += i64::from(b.weight);
            }
        }
    }
    let round = Round::full(lang.pick("Approvals", "Approbations"), &tally).note(lang.pick(
        "Voters approve as many candidates as they like; most approvals wins.",
        "Chaque électeur approuve autant de candidats qu’il le souhaite ; le plus grand nombre d’approbations \
         l’emporte.",
    ));
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

pub(super) fn score(e: &Election, lang: Lang) -> Outcome {
    let total = totals(e);
    let max = e.max_score;
    let round = Round::full(lang.pick("Total score", "Total des notes"), &total).note(tr!(
        lang,
        "Each voter scores every candidate from 0 to {max}; the highest total wins.",
        "Chaque électeur note chaque candidat de 0 à {max} ; le meilleur total l’emporte."
    ));
    Outcome::new(Method::Score, tiers_by(0..total.len(), |c| total[c]), vec![round], false)
}

pub(super) fn star(e: &Election, lang: Lang) -> Outcome {
    let n = e.num_candidates();
    let total = totals(e);
    let mut round1 = Round::full(lang.pick("Scoring round", "Tour des notes"), &total);
    if n < 2 {
        return Outcome::new(Method::Star, vec![vec![0]], vec![round1], false);
    }
    let mut order: Vec<CandidateId> = (0..n).collect();
    order.sort_by(|&a, &b| total[b].cmp(&total[a]).then(a.cmp(&b)));
    let (a, b) = (order[0], order[1]);
    let mut tiebreak = n > 2 && total[order[1]] == total[order[2]];
    round1.eliminated = order[2..].to_vec();
    round1 = round1.note(tr!(
        lang,
        "{} and {} have the two highest totals and go to the runoff.",
        "{} et {} ont les deux meilleurs totaux et passent au second tour.",
        e.name(a),
        e.name(b)
    ));

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
    let mut round2 = Round::new(lang.pick("Automatic runoff", "Second tour automatique"), tallies).note(lang.pick(
        "Every ballot counts as one vote for whichever finalist it scored higher.",
        "Chaque bulletin compte comme une voix pour le finaliste qu’il a le mieux noté.",
    ));
    if neither > 0 {
        round2 = round2.note(match lang {
            Lang::En => format!("{neither} ballot(s) scored both finalists equally and sit this round out."),
            Lang::Fr if neither == 1 => {
                "1 bulletin donne la même note aux deux finalistes et ne compte pas dans ce tour.".to_string()
            }
            Lang::Fr => {
                format!("{neither} bulletins donnent la même note aux deux finalistes et ne comptent pas dans ce tour.")
            }
        });
    }
    // Runoff first; the scoring round settles a tied runoff.
    let key = |c: CandidateId| (if c == a { for_a } else { for_b }, total[c]);
    let mut ranking = if key(a) == key(b) {
        tiebreak = true;
        round2 = round2.note(lang.pick(
            "The runoff and the totals are both tied.",
            "Le second tour et les totaux sont tous deux à égalité.",
        ));
        vec![vec![a.min(b), a.max(b)]]
    } else {
        let (w, l) = if key(a) > key(b) { (a, b) } else { (b, a) };
        let name = e.name(w);
        if for_a == for_b {
            round2 = round2.note(tr!(
                lang,
                "The runoff is tied, so the higher total score wins: {name}.",
                "Le second tour est à égalité, donc le meilleur total l’emporte : {name}."
            ));
        } else {
            round2 = round2.note(tr!(
                lang,
                "{name} is preferred on more ballots and wins.",
                "Plus de bulletins préfèrent {name}, qui l’emporte."
            ));
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
        assert_eq!(score(&e, Lang::En).winner, 0);
        assert_eq!(star(&e, Lang::En).winner, 0);
        e.push(ballot(4, &[3, 5, 0]));
        // Totals: Ada 37, Bea 42. Runoff: Ada 5 ballots, Bea 6.
        assert_eq!(score(&e, Lang::En).winner, 1);
        let out = star(&e, Lang::En);
        assert_eq!(out.winner, 1);
        assert_eq!(out.rounds[1].tallies, vec![Some(5.0), Some(6.0), None]);
    }

    #[test]
    fn approval_counts_flags() {
        let e = Election::named(3).with(2, &[0, 1, 2]).with(1, &[2, 1, 0]);
        // With three candidates, ballots built from rankings approve only their top choice.
        assert_eq!(approval(&e, Lang::En).rounds[0].tallies, vec![Some(2.0), Some(0.0), Some(1.0)]);
    }
}
