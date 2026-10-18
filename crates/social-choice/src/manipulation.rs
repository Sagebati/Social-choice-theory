//! Strategic voting: can some voters get a result they like better by lying?
//!
//! The Gibbard–Satterthwaite theorem says that, with three or more candidates,
//! every ranked method that is not a dictatorship can be manipulated in some
//! election. This module finds the manipulations in a given election and
//! measures how often random elections can be manipulated at all.

use crate::criteria::{switch_voters, weight_steps};
use crate::election::{all_rankings, Ballot, CandidateId, Election};
use crate::lang::Lang;
use crate::methods::{BallotKind, Method};
use crate::random::{random_election, Rng};
use crate::text::{describe_ballot_in, fr_de, voters_in};
use serde::{Deserialize, Serialize};

/// The classic kinds of strategic vote.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Tactic {
    /// Ranking a "lesser evil" higher than you really feel.
    Compromising,
    /// Ranking a strong rival lower than you really feel.
    Burying,
    /// Both at once.
    CompromisingAndBurying,
    /// Boosting a candidate you do not want, to change who your favourite faces.
    PushOver,
    /// Supporting only your favourite(s) and nobody else.
    BulletVoting,
    /// Using only the top and bottom of the score scale.
    Exaggeration,
}

impl Tactic {
    pub fn name(self) -> &'static str {
        self.name_in(Lang::En)
    }

    pub fn name_in(self, lang: Lang) -> &'static str {
        match self {
            Tactic::Compromising => lang.pick("Compromising", "Vote utile"),
            Tactic::Burying => lang.pick("Burying", "Enterrement"),
            Tactic::CompromisingAndBurying => lang.pick("Compromising and burying", "Vote utile et enterrement"),
            Tactic::PushOver => "Push-over",
            Tactic::BulletVoting => lang.pick("Bullet voting", "Vote exclusif"),
            Tactic::Exaggeration => lang.pick("Exaggeration", "Exagération"),
        }
    }

    pub fn description(self) -> &'static str {
        self.description_in(Lang::En)
    }

    pub fn description_in(self, lang: Lang) -> &'static str {
        match self {
            Tactic::Compromising => lang.pick(
                "Rank a lesser evil higher than you really feel, so a worse candidate loses.",
                "Classer un moindre mal plus haut que vous ne le pensez, pour faire perdre un candidat pire.",
            ),
            Tactic::Burying => lang.pick(
                "Rank a strong rival lower than you really feel, so they lose ground.",
                "Classer un rival dangereux plus bas que vous ne le pensez, pour qu’il perde du terrain.",
            ),
            Tactic::CompromisingAndBurying => lang.pick(
                "Raise a lesser evil and sink the main rival on the same ballot.",
                "Remonter un moindre mal et couler le principal rival sur le même bulletin.",
            ),
            Tactic::PushOver => lang.pick(
                "Boost a candidate you do not even want, so your favourite faces an easier opponent or a \
                 stronger rival is knocked out.",
                "Soutenir un candidat dont vous ne voulez même pas, pour que votre favori affronte un adversaire \
                 plus facile ou qu’un rival plus fort soit éliminé.",
            ),
            Tactic::BulletVoting => lang.pick(
                "Support only your favourite, so your other preferences cannot help them lose.",
                "Ne soutenir que votre favori, pour que vos autres préférences ne puissent pas le faire perdre.",
            ),
            Tactic::Exaggeration => lang.pick(
                "Give only maximum and minimum scores, so your ballot counts at full strength.",
                "Ne donner que la note maximale ou minimale, pour que votre bulletin pèse de tout son poids.",
            ),
        }
    }
}

/// A group of voters who can change the result in their favour by voting
/// insincerely.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Manipulation {
    /// Index of the ballot bloc the liars come from.
    pub group: usize,
    /// How many voters of that bloc need to lie.
    pub voters: u32,
    /// Their honest ballot.
    pub sincere: Ballot,
    /// The ballot they cast instead.
    pub strategic: Ballot,
    pub honest_winner: CandidateId,
    pub new_winner: CandidateId,
    pub tactic: Tactic,
    pub explanation: String,
    /// The election after the lie.
    pub election: Election,
}

/// Every useful lie for each bloc of voters, taking only the cheapest way (fewest
/// liars) to reach each new winner with each tactic. Best first, at most `limit`.
pub fn find_manipulations(e: &Election, method: Method, limit: usize) -> Vec<Manipulation> {
    find_manipulations_in(e, method, limit, Lang::En)
}

/// [`find_manipulations`], explained in `lang`.
pub fn find_manipulations_in(e: &Election, method: Method, limit: usize, lang: Lang) -> Vec<Manipulation> {
    let mut found = search(e, method, false);
    found.sort_by_key(|m| (m.voters, m.group, m.tactic));
    found.truncate(limit);
    for m in &mut found {
        m.explanation = explain(e, method.ballot_kind(), m, lang);
    }
    found
}

/// True if any bloc can get a better result by lying.
pub fn is_manipulable(e: &Election, method: Method) -> bool {
    !search(e, method, true).is_empty()
}

fn search(e: &Election, method: Method, first_only: bool) -> Vec<Manipulation> {
    let honest = method.run(e);
    let w = honest.winner;
    let kind = method.ballot_kind();
    let mut found: Vec<Manipulation> = Vec::new();
    for (g, sincere) in e.ballots.iter().enumerate() {
        if sincere.weight == 0 || sincere.ranking[0] == w {
            continue;
        }
        // A lie works with `k` liars if it elects someone this bloc prefers to `w`.
        let works = |lie: &Ballot, k: u32| {
            let after = switch_voters(e, g, k, lie);
            let out = method.run(&after);
            (out.is_decisive() && out.winner != w && sincere.prefers(out.winner, w)).then_some((after, out.winner))
        };
        let steps = weight_steps(sincere.weight);
        for lie in strategic_ballots(sincere, kind, e.max_score) {
            let Some(i) = steps.iter().position(|&k| works(&lie, k).is_some()) else { continue };
            // On a coarse ladder of counts, look for fewer liars below the rung that worked.
            let from = if i == 0 { 1 } else { steps[i - 1] + 1 };
            let k = (from..steps[i]).find(|&j| works(&lie, j).is_some()).unwrap_or(steps[i]);
            let (after, x) = works(&lie, k).expect("checked above");
            let tactic = classify(kind, sincere, &lie, w, x, e.max_score);
            let cheaper_known =
                found.iter().any(|m| m.group == g && m.new_winner == x && m.tactic == tactic && m.voters <= k);
            if !cheaper_known {
                found.retain(|m| !(m.group == g && m.new_winner == x && m.tactic == tactic));
                found.push(Manipulation {
                    group: g,
                    voters: k,
                    sincere: sincere.clone().weighted(k),
                    strategic: lie.clone().weighted(k),
                    honest_winner: w,
                    new_winner: x,
                    tactic,
                    // Written once the search is over, for the few that are kept.
                    explanation: String::new(),
                    election: after,
                });
                if first_only {
                    return found;
                }
            }
        }
    }
    found
}

/// The insincere ballots worth trying, given what the method reads.
fn strategic_ballots(b: &Ballot, kind: BallotKind, max_score: u32) -> Vec<Ballot> {
    let n = b.ranking.len();
    let mut out: Vec<Ballot> = Vec::new();
    let mut push = |candidate: Ballot| {
        if candidate != *b && !out.contains(&candidate) {
            out.push(candidate);
        }
    };
    let with_ranking = |ranking: Vec<CandidateId>| Ballot { ranking, ..b.clone() };
    let move_to = |c: CandidateId, top: bool| {
        let mut ranking: Vec<CandidateId> = b.ranking.iter().copied().filter(|&x| x != c).collect();
        if top {
            ranking.insert(0, c);
        } else {
            ranking.push(c);
        }
        ranking
    };
    match kind {
        BallotKind::ChooseOne => (0..n).for_each(|c| push(with_ranking(move_to(c, true)))),
        BallotKind::Veto => (0..n).for_each(|c| push(with_ranking(move_to(c, false)))),
        BallotKind::Ranked if n <= 6 => all_rankings(n).into_iter().for_each(|r| push(with_ranking(r))),
        BallotKind::Ranked => {
            for x in 0..n {
                push(with_ranking(move_to(x, true)));
                push(with_ranking(move_to(x, false)));
                for y in (0..n).filter(|&y| y != x) {
                    let mut r: Vec<CandidateId> = move_to(x, true).into_iter().filter(|&c| c != y).collect();
                    r.push(y);
                    push(with_ranking(r));
                }
            }
        }
        BallotKind::Approval if n <= 10 => {
            for mask in 1..(1u32 << n) - 1 {
                let approvals = (0..n).map(|c| mask & (1 << c) != 0).collect();
                push(Ballot { approvals, ..b.clone() });
            }
        }
        BallotKind::Approval => {
            for k in 1..n {
                let mut approvals = vec![false; n];
                b.ranking[..k].iter().for_each(|&c| approvals[c] = true);
                push(Ballot { approvals, ..b.clone() });
            }
        }
        BallotKind::Score => {
            if n <= 10 {
                for mask in 0..(1u32 << n) {
                    let scores = (0..n).map(|c| if mask & (1 << c) != 0 { max_score } else { 0 }).collect();
                    push(Ballot { scores, ..b.clone() });
                }
            }
            for x in 0..n {
                for target in [0, max_score] {
                    let mut scores = b.scores.clone();
                    scores[x] = target;
                    push(Ballot { scores, ..b.clone() });
                }
                for y in (0..n).filter(|&y| y != x) {
                    let mut scores = b.scores.clone();
                    scores[x] = max_score;
                    scores[y] = 0;
                    push(Ballot { scores, ..b.clone() });
                }
            }
        }
    }
    out
}

fn classify(
    kind: BallotKind,
    sincere: &Ballot,
    lie: &Ballot,
    w: CandidateId,
    x: CandidateId,
    max_score: u32,
) -> Tactic {
    match kind {
        BallotKind::ChooseOne => Tactic::Compromising,
        BallotKind::Veto => Tactic::Burying,
        BallotKind::Ranked => {
            let raised_x = lie.position(x) < sincere.position(x);
            let buried_w = lie.position(w) > sincere.position(w);
            match (raised_x, buried_w) {
                (true, false) => Tactic::Compromising,
                (false, true) => Tactic::Burying,
                (true, true) => Tactic::CompromisingAndBurying,
                (false, false) => Tactic::PushOver,
            }
        }
        BallotKind::Approval => {
            let subset = (0..lie.approvals.len()).all(|c| !lie.approvals[c] || sincere.approvals[c]);
            if subset {
                Tactic::BulletVoting
            } else if lie.approvals[x] && !sincere.approvals[x] {
                Tactic::Compromising
            } else if !lie.approvals[w] && sincere.approvals[w] {
                Tactic::Burying
            } else {
                Tactic::PushOver
            }
        }
        BallotKind::Score => {
            let extreme = lie.scores.iter().all(|&s| s == 0 || s == max_score);
            let raised_x = lie.scores[x] > sincere.scores[x];
            let buried_w = lie.scores[w] < sincere.scores[w];
            match (raised_x, buried_w) {
                _ if extreme && sincere.scores.iter().any(|&s| s != 0 && s != max_score) => Tactic::Exaggeration,
                (true, false) => Tactic::Compromising,
                (false, true) => Tactic::Burying,
                (true, true) => Tactic::CompromisingAndBurying,
                (false, false) => Tactic::PushOver,
            }
        }
    }
}

/// The manipulation in a sentence, for the voters of bloc `m.group` in `e`.
fn explain(e: &Election, kind: BallotKind, m: &Manipulation, lang: Lang) -> String {
    let (k, bloc) = (m.voters, e.ballots[m.group].weight);
    let (x, w) = (e.name(m.new_winner), e.name(m.honest_winner));
    let honest = describe_ballot_in(e, &m.sincere, kind, lang);
    let lie = describe_ballot_in(e, &m.strategic, kind, lang);
    let tactic = m.tactic.name_in(lang).to_lowercase();
    match lang {
        Lang::En => {
            let how = match m.tactic {
                Tactic::Compromising => format!("propping up {x}"),
                Tactic::Burying => format!("sinking {w}"),
                Tactic::CompromisingAndBurying => format!("propping up {x} and sinking {w}"),
                Tactic::PushOver => "boosting a candidate they do not want".to_string(),
                Tactic::BulletVoting => "withholding support from their other choices".to_string(),
                Tactic::Exaggeration => "using only the top and bottom scores".to_string(),
            };
            let who = if k == bloc {
                format!("The {} whose honest ballot is {honest}", voters_in(u64::from(k), lang))
            } else {
                format!("{k} of the {bloc} voters whose honest ballot is {honest}")
            };
            format!(
                "{who} can vote {lie} instead ({tactic}: {how}). Then {x} wins instead of {w}, and they prefer {x}."
            )
        }
        Lang::Fr => {
            let one = k == 1;
            let (their, they, want) = if one { ("ses", "il", "veut") } else { ("leurs", "ils", "veulent") };
            let how = match m.tactic {
                Tactic::Compromising => format!("en remontant {x}"),
                Tactic::Burying => format!("en enfonçant {w}"),
                Tactic::CompromisingAndBurying => format!("en remontant {x} et en enfonçant {w}"),
                Tactic::PushOver => format!("en poussant un candidat dont {they} ne {want} pas"),
                Tactic::BulletVoting => format!("en refusant de soutenir {their} autres choix"),
                Tactic::Exaggeration => "en n’utilisant que la note maximale et la note minimale".to_string(),
            };
            let who = match (k == bloc, one) {
                (true, true) => format!("L’électeur qui vote sincèrement {honest}"),
                (true, false) => format!("Les {k} électeurs qui votent sincèrement {honest}"),
                (false, _) => format!("{k} des {bloc} électeurs qui votent sincèrement {honest}"),
            };
            let (can, prefer) = if one { ("peut", "préfère") } else { ("peuvent", "préfèrent") };
            let instead_of = fr_de(w);
            format!(
                "{who} {can} plutôt voter {lie} ({tactic} : {how}). Alors {x} gagne à la place {instead_of}, \
                 et {they} {prefer} {x}."
            )
        }
    }
}

/// A losing candidate whose presence changes the winner.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Spoiler {
    pub candidate: CandidateId,
    /// Who would win if `candidate` withdrew.
    pub winner_without: CandidateId,
}

/// Every losing candidate who is spoiling the election: if they dropped out,
/// someone else would win.
pub fn find_spoilers(e: &Election, method: Method) -> Vec<Spoiler> {
    let w = method.run(e).winner;
    let n = e.num_candidates();
    (0..n)
        .filter(|&c| c != w && n > 1)
        .filter_map(|c| {
            let keep: Vec<CandidateId> = (0..n).filter(|&x| x != c).collect();
            let without = keep[method.run(&e.restrict(&keep)).winner];
            (without != w).then_some(Spoiler { candidate: c, winner_without: without })
        })
        .collect()
}

/// How often random elections can be manipulated under a method.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Manipulability {
    pub method: Method,
    pub candidates: usize,
    pub samples: usize,
    pub manipulable: usize,
    pub rate: f64,
}

/// Draws `samples` random elections (the same ones for every method with the same
/// seed) and counts those where some bloc of voters can profit from lying.
pub fn manipulability(method: Method, candidates: usize, samples: usize, seed: u64) -> Manipulability {
    let mut rng = Rng::new(seed);
    let mut manipulable = 0;
    for _ in 0..samples {
        let groups = rng.range(3, 6) as usize;
        let e = random_election(&mut rng, candidates, groups, 9);
        if is_manipulable(&e, method) {
            manipulable += 1;
        }
    }
    Manipulability {
        method,
        candidates,
        samples,
        manipulable,
        rate: if samples == 0 { 0.0 } else { manipulable as f64 / samples as f64 },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plurality_voters_compromise() {
        // Cal's voters prefer Bea to Ada. If they vote for Bea, Bea wins.
        let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]);
        let found = find_manipulations(&e, Method::Plurality, 10);
        let m = found.iter().find(|m| m.group == 2).unwrap();
        assert_eq!(m.new_winner, 1);
        assert_eq!(m.tactic, Tactic::Compromising);
        // 6 of 25 switching makes Bea 41 to Ada's 40.
        assert_eq!(m.voters, 6);
        assert_eq!(Method::Plurality.run(&m.election).winner, 1);
    }

    #[test]
    fn explanations_in_french() {
        let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]).complete().unwrap();
        let en = find_manipulations(&e, Method::Plurality, 10);
        let fr = find_manipulations_in(&e, Method::Plurality, 10, Lang::Fr);
        assert_eq!(en.len(), fr.len());
        let m = fr.iter().find(|m| m.group == 2).unwrap();
        assert_eq!(
            m.explanation,
            "6 des 25 électeurs qui votent sincèrement pour Cal peuvent plutôt voter pour Bea (vote utile : en \
             remontant Bea). Alors Bea gagne à la place d’Ada, et ils préfèrent Bea."
        );
        let m = en.iter().find(|m| m.group == 2).unwrap();
        assert!(m.explanation.starts_with("6 of the 25 voters whose honest ballot is for Cal can vote for Bea"));
    }

    #[test]
    fn finds_the_fewest_liars_in_big_blocs() {
        // Honest Borda: Ada 140, Bea 130. Eleven buriers bring Ada down to 129.
        let e = Election::named(3).with(50, &[0, 1, 2]).with(40, &[1, 0, 2]);
        let m = find_manipulations(&e, Method::Borda, 10).into_iter().find(|m| m.tactic == Tactic::Burying).unwrap();
        assert_eq!(m.voters, 11);
        let big = Election::named(3).with(500, &[0, 1, 2]).with(400, &[1, 0, 2]);
        let m = find_manipulations(&big, Method::Borda, 10).into_iter().find(|m| m.tactic == Tactic::Burying).unwrap();
        assert_eq!(m.voters, 101);
    }

    #[test]
    fn borda_voters_bury() {
        let e = Election::named(3).with(5, &[0, 1, 2]).with(4, &[1, 0, 2]);
        assert_eq!(Method::Borda.run(&e).winner, 0);
        let found = find_manipulations(&e, Method::Borda, 10);
        assert!(found.iter().any(|m| m.tactic == Tactic::Burying && m.new_winner == 1));
    }

    #[test]
    fn dictatorship_cannot_be_manipulated() {
        let report = manipulability(Method::Dictatorship, 3, 200, 5);
        assert_eq!(report.manipulable, 0);
        let plurality = manipulability(Method::Plurality, 3, 200, 5);
        assert!(plurality.manipulable > 0);
    }

    #[test]
    fn spoilers_are_detected() {
        let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]);
        let spoilers = find_spoilers(&e, Method::Plurality);
        assert_eq!(
            spoilers,
            vec![Spoiler { candidate: 1, winner_without: 2 }, Spoiler { candidate: 2, winner_without: 1 },]
        );
        assert!(find_spoilers(&e, Method::Schulze).is_empty());
    }
}
