//! Famous small elections that each show one paradox or one way to game a method.
//! The tests at the bottom check every claim the stories make.

use crate::election::Election;
use crate::methods::Method;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Scenario {
    pub id: &'static str,
    pub title: &'static str,
    pub story: &'static str,
    /// Methods worth comparing on this election.
    pub methods: Vec<Method>,
    pub election: Election,
}

pub fn all() -> Vec<Scenario> {
    use Method::*;
    vec![
        Scenario {
            id: "spoiler",
            title: "The spoiler",
            story: "Ada leads with 40 first choices. Bea and Cal split the other 60, although every Cal \
                    voter would take Bea over Ada. Under plurality Ada wins; if Cal dropped out, Bea would \
                    win. Bea is also the Condorcet winner, beating Ada 60–40 and Cal 75–25.",
            methods: vec![Plurality, Irv, Borda, Schulze],
            election: Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]),
        },
        Scenario {
            id: "center_squeeze",
            title: "Centre squeeze",
            story: "Bea sits in the middle and is everybody's first or second choice. She would beat Ada \
                    65–35 and Cal 67–33 head to head. But Bea has the fewest first choices, so instant \
                    runoff eliminates Bea first and Ada wins.",
            methods: vec![Plurality, Irv, Borda, Schulze],
            election: Election::named(3).with(35, &[0, 1, 2]).with(33, &[2, 1, 0]).with(32, &[1, 0, 2]),
        },
        Scenario {
            id: "monotonicity",
            title: "Winning by losing",
            story: "Under instant runoff Ada wins: Cal is eliminated and Cal's voters move to Ada. Now \
                    suppose 10 of Bea's voters are won over and rank Ada first. Bea drops below Cal, is \
                    eliminated instead, Bea's voters flow to Cal, and Cal beats Ada 51–49. Gaining support \
                    cost Ada the election.",
            methods: vec![Irv, TwoRound, Plurality],
            election: Election::named(3).with(39, &[0, 1, 2]).with(35, &[1, 2, 0]).with(26, &[2, 0, 1]),
        },
        Scenario {
            id: "no_show",
            title: "Better off staying home",
            story: "Under instant runoff Bea is eliminated first, Bea's voters go to Ada, and Ada beats Cal \
                    50–40. Now 15 more voters turn up ranking Bea > Ada > Cal. Bea overtakes Ada, so Ada \
                    is eliminated instead, Ada's voters go to Cal, and Cal wins. The newcomers preferred \
                    Ada to Cal: by voting they elected the candidate they liked least.",
            methods: vec![Irv, Plurality, Schulze],
            election: Election::named(3).with(20, &[1, 0, 2]).with(40, &[2, 0, 1]).with(30, &[0, 2, 1]),
        },
        Scenario {
            id: "condorcet_paradox",
            title: "Rock, paper, scissors",
            story: "A majority prefers Ada to Bea (6–3), a majority prefers Bea to Cal (7–2), and a \
                    majority prefers Cal to Ada (5–4). Every candidate loses to somebody, so there is no \
                    Condorcet winner. In an agenda of duels, whoever enters last wins.",
            methods: vec![Agenda, Copeland, Minimax, Schulze, RankedPairs, Irv],
            election: Election::named(3).with(4, &[0, 1, 2]).with(3, &[1, 2, 0]).with(2, &[2, 0, 1]),
        },
        Scenario {
            id: "condorcet_burying",
            title: "Burying the Condorcet winner",
            story: "Ada is the Condorcet winner, beating Bea 20–15 and Cal 25–10. Bea's 15 supporters \
                    honestly rank Ada second. If 11 or more of them rank Ada last instead, Cal beats Ada \
                    (21–14 or more), the majorities go round in a cycle, and its weakest link becomes \
                    Ada's 20–15 win over Bea. Schulze, ranked pairs and minimax all break the cycle \
                    there, and Bea wins.",
            methods: vec![Schulze, RankedPairs, Minimax, Copeland],
            election: Election::named(3).with(10, &[0, 1, 2]).with(10, &[2, 0, 1]).with(15, &[1, 0, 2]),
        },
        Scenario {
            id: "borda_burying",
            title: "Burying under Borda",
            story: "Honestly, Ada scores 140 Borda points to Bea's 130. If Bea's 40 voters move Ada from \
                    second place to last, below hopeless Cal, Ada falls to 100 and Bea wins with 130.",
            methods: vec![Borda, Plurality, Schulze],
            election: Election::named(3).with(50, &[0, 1, 2]).with(40, &[1, 0, 2]),
        },
        Scenario {
            id: "borda_teaming",
            title: "Teaming with a clone",
            story: "Between Ada and Bea alone, Ada wins 30–20. Bea's party adds Bex, a near-copy of Bea \
                    that everyone ranks right next to Bea. Bex wins nothing, but pushes Ada down \
                    the ballots of Bea's supporters, and Bea now wins the Borda count 70 to 60.",
            methods: vec![Borda, Irv, Schulze],
            election: Election::new(["Ada", "Bea", "Bex"]).with(30, &[0, 1, 2]).with(20, &[1, 2, 0]),
        },
    ]
}

pub fn get(id: &str) -> Option<Scenario> {
    all().into_iter().find(|s| s.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::criteria::switch_voters;
    use crate::election::Ballot;
    use crate::manipulation::find_spoilers;
    use crate::pairwise::PairwiseMatrix;
    use Method::*;

    fn winner(m: Method, e: &Election) -> &str {
        let out = m.run(e);
        assert!(out.is_decisive(), "{m} needs a tie-break");
        e.name(out.winner)
    }

    #[test]
    fn ids_are_unique_and_rig_links_resolve() {
        let ids: Vec<&str> = all().iter().map(|s| s.id).collect();
        let mut sorted = ids.clone();
        sorted.dedup();
        assert_eq!(ids.len(), sorted.len());
        for info in crate::catalog::all() {
            for r in info.rigging {
                if let Some(s) = r.scenario {
                    assert!(get(s).is_some(), "{} links to missing scenario {s}", info.id);
                }
            }
        }
    }

    #[test]
    fn spoiler() {
        let e = get("spoiler").unwrap().election;
        assert_eq!(winner(Plurality, &e), "Ada");
        assert_eq!(winner(Plurality, &e.without(2)), "Bea");
        assert!(find_spoilers(&e, Plurality).iter().any(|s| s.candidate == 2 && s.winner_without == 1));
        let pm = PairwiseMatrix::new(&e);
        assert_eq!(pm.condorcet_winner(), Some(1));
        assert_eq!((pm.prefer(1, 0), pm.prefer(1, 2)), (60, 75));
    }

    #[test]
    fn center_squeeze() {
        let e = get("center_squeeze").unwrap().election;
        let pm = PairwiseMatrix::new(&e);
        assert_eq!(pm.condorcet_winner(), Some(1));
        assert_eq!((pm.prefer(1, 0), pm.prefer(1, 2)), (65, 67));
        assert_eq!(winner(Irv, &e), "Ada");
        assert_eq!(Irv.run(&e).rounds[0].eliminated, vec![1]);
        assert_eq!(winner(Borda, &e), "Bea");
    }

    #[test]
    fn monotonicity() {
        let e = get("monotonicity").unwrap().election;
        assert_eq!(winner(Irv, &e), "Ada");
        let raised = Ballot::from_ranking(vec![0, 1, 2], e.max_score);
        let after = switch_voters(&e, 1, 10, &raised).compress();
        assert_eq!(winner(Irv, &after), "Cal");
        assert_eq!(Irv.run(&after).rounds.last().unwrap().tallies, vec![Some(49.0), None, Some(51.0)]);
    }

    #[test]
    fn no_show() {
        let mut e = get("no_show").unwrap().election;
        assert_eq!(winner(Irv, &e), "Ada");
        assert_eq!(Irv.run(&e).rounds[1].tallies, vec![Some(50.0), None, Some(40.0)]);
        e.push(Ballot::from_ranking(vec![1, 0, 2], e.max_score).weighted(15));
        assert_eq!(winner(Irv, &e), "Cal");
    }

    #[test]
    fn condorcet_paradox() {
        let e = get("condorcet_paradox").unwrap().election;
        let pm = PairwiseMatrix::new(&e);
        assert_eq!((pm.prefer(0, 1), pm.prefer(1, 2), pm.prefer(2, 0)), (6, 7, 5));
        assert_eq!(pm.condorcet_winner(), None);
        assert_eq!(winner(Agenda, &e), "Cal");
    }

    #[test]
    fn condorcet_burying() {
        let e = get("condorcet_burying").unwrap().election;
        let pm = PairwiseMatrix::new(&e);
        assert_eq!(pm.condorcet_winner(), Some(0));
        assert_eq!((pm.prefer(0, 1), pm.prefer(0, 2)), (20, 25));
        let buried = Ballot::from_ranking(vec![1, 2, 0], e.max_score);
        for m in [Schulze, RankedPairs, Minimax] {
            assert_eq!(winner(m, &e), "Ada");
            // Nine buriers already make a cycle, but Ada survives it; eleven do the job.
            assert!(PairwiseMatrix::new(&switch_voters(&e, 2, 9, &buried)).majority_cycle().is_some());
            assert_eq!(winner(m, &switch_voters(&e, 2, 9, &buried)), "Ada", "{m}");
            assert_eq!(winner(m, &switch_voters(&e, 2, 11, &buried)), "Bea", "{m}");
        }
    }

    #[test]
    fn borda_burying() {
        let e = get("borda_burying").unwrap().election;
        assert_eq!(Borda.run(&e).rounds[0].tallies[..2], [Some(140.0), Some(130.0)]);
        let buried = Ballot::from_ranking(vec![1, 2, 0], e.max_score);
        let after = switch_voters(&e, 1, 40, &buried);
        assert_eq!(Borda.run(&after).rounds[0].tallies[..2], [Some(100.0), Some(130.0)]);
        assert_eq!(winner(Borda, &after), "Bea");
    }

    #[test]
    fn borda_teaming() {
        let e = get("borda_teaming").unwrap().election;
        assert_eq!(winner(Borda, &e), "Bea");
        assert_eq!(Borda.run(&e).rounds[0].tallies[..2], [Some(60.0), Some(70.0)]);
        assert_eq!(winner(Borda, &e.without(2)), "Ada");
        // Clone-proof methods are not fooled.
        assert_eq!(winner(Irv, &e), "Ada");
        assert_eq!(winner(Schulze, &e), "Ada");
    }
}
