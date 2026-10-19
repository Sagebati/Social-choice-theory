//! Famous small elections that each show one paradox or one way to game a method.
//! The tests at the bottom check every claim the stories make.

use crate::election::Election;
use crate::lang::Lang;
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

/// The town of Riverton, which the journey follows from start to finish: five
/// groups of voters, five candidates, and a different mayor under each of
/// plurality, two-round runoff, instant runoff, Borda and the Condorcet methods.
///
/// Candidates: Cuauhtémoc, Manu, Melon, Poutine, Duck. Ballots, one per group:
/// Lucas's 9, Léo's 7, Aïda's 6, Clélia's 5 and Robinson's 3.
pub fn riverton() -> Election {
    Election::new(["Cuauhtémoc", "Manu", "Melon", "Poutine", "Duck"])
        .with(9, &[4, 1, 2, 3, 0])
        .with(7, &[0, 1, 2, 3, 4])
        .with(6, &[2, 3, 1, 0, 4])
        .with(5, &[3, 2, 4, 0, 1])
        .with(3, &[1, 3, 0, 2, 4])
}

pub fn all() -> Vec<Scenario> {
    all_in(Lang::En)
}

/// Every scenario, with its title and story in `lang`.
pub fn all_in(lang: Lang) -> Vec<Scenario> {
    use Method::*;
    vec![
        Scenario {
            id: "riverton",
            title: lang.pick("Riverton elects a mayor", "Riverton élit son maire"),
            story: lang.pick(
                "Thirty voters in five groups, five candidates. Plurality elects Duck, two rounds elect \
                        Cuauhtémoc, instant runoff elects Poutine, the Borda count elects Melon, and every Condorcet \
                        method elects Manu, who beats each rival one on one. Duck, the plurality winner, loses \
                        every one-on-one contest.",
                "Trente électeurs répartis en cinq groupes, cinq candidats. Le scrutin à un tour élit Duck, le scrutin \
                        à deux tours élit Cuauhtémoc, le vote alternatif Poutine, la méthode de Borda Melon, et toutes les \
                        méthodes de Condorcet élisent Manu, qui bat chaque rival en duel. Duck, vainqueur du scrutin \
                        à un tour, perd tous ses duels.",
            ),
            methods: vec![Plurality, TwoRound, Irv, Borda, Schulze, Approval, Star],
            election: riverton(),
        },
        Scenario {
            id: "spoiler",
            title: lang.pick("The spoiler", "Le trouble-fête"),
            story: lang.pick(
                "Ada leads with 40 first choices. Bea and Cal split the other 60, although every Cal \
                        voter would take Bea over Ada. Under plurality Ada wins; if Cal dropped out, Bea would \
                        win. Bea is also the Condorcet winner, beating Ada 60–40 and Cal 75–25.",
                "Ada est en tête avec 40 premiers choix. Bea et Cal se partagent les 60 autres, alors que tous les \
                 électeurs de Cal préféreraient Bea à Ada. Au scrutin à un tour, Ada gagne ; si Cal se retirait, Bea \
                 gagnerait. Bea est d’ailleurs vainqueur de Condorcet : 60 à 40 contre Ada, 75 à 25 contre Cal.",
            ),
            methods: vec![Plurality, Irv, Borda, Schulze],
            election: Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]),
        },
        Scenario {
            id: "center_squeeze",
            title: lang.pick("Centre squeeze", "Le centre pris en étau"),
            story: lang.pick(
                "Bea sits in the middle and is everybody's first or second choice. She would beat Ada \
                        65–35 and Cal 67–33 head to head. But Bea has the fewest first choices, so instant \
                        runoff eliminates Bea first and Ada wins.",
                "Bea est au centre : c’est le premier ou le deuxième choix de tout le monde. En duel, elle battrait \
                 Ada 65 à 35 et Cal 67 à 33. Mais Bea a le moins de premiers choix : le vote alternatif l’élimine \
                 d’emblée, et Ada gagne.",
            ),
            methods: vec![Plurality, Irv, Borda, Schulze],
            election: Election::named(3).with(35, &[0, 1, 2]).with(33, &[2, 1, 0]).with(32, &[1, 0, 2]),
        },
        Scenario {
            id: "monotonicity",
            title: lang.pick("Winning by losing", "Perdre en gagnant des voix"),
            story: lang.pick(
                "Under instant runoff Ada wins: Cal is eliminated and Cal's voters move to Ada. Now \
                        suppose 10 of Bea's voters are won over and rank Ada first. Bea drops below Cal, is \
                        eliminated instead, Bea's voters flow to Cal, and Cal beats Ada 51–49. Gaining support \
                        cost Ada the election.",
                "Au vote alternatif, Ada gagne : Cal sort de la course et ses électeurs se reportent sur Ada. \
                 Supposons maintenant que 10 électeurs de Bea, convaincus, placent Ada en tête. Bea passe derrière Cal \
                 et sort à sa place, les voix de Bea se reportent sur Cal, et Cal bat Ada 51 à 49. Gagner des soutiens \
                 a coûté l’élection à Ada.",
            ),
            methods: vec![Irv, TwoRound, Plurality],
            election: Election::named(3).with(39, &[0, 1, 2]).with(35, &[1, 2, 0]).with(26, &[2, 0, 1]),
        },
        Scenario {
            id: "no_show",
            title: lang.pick("Better off staying home", "Mieux vaut rester chez soi"),
            story: lang.pick(
                "Under instant runoff Bea is eliminated first, Bea's voters go to Ada, and Ada beats Cal \
                        50–40. Now 15 more voters turn up ranking Bea > Ada > Cal. Bea overtakes Ada, so Ada \
                        is eliminated instead, Ada's voters go to Cal, and Cal wins. The newcomers preferred \
                        Ada to Cal: by voting they elected the candidate they liked least.",
                "Au vote alternatif, Bea sort de la course en premier, ses voix se reportent sur Ada, et Ada bat Cal \
                 50 à 40. Arrivent alors 15 électeurs de plus, qui votent Bea > Ada > Cal. Bea dépasse Ada, qui sort à \
                 sa place ; les voix d’Ada se reportent sur Cal, qui gagne. Les nouveaux venus préféraient Ada à Cal : \
                 en votant, ils ont fait élire le candidat qu’ils aimaient le moins.",
            ),
            methods: vec![Irv, Plurality, Schulze],
            election: Election::named(3).with(20, &[1, 0, 2]).with(40, &[2, 0, 1]).with(30, &[0, 2, 1]),
        },
        Scenario {
            id: "condorcet_paradox",
            title: lang.pick("Rock, paper, scissors", "Pierre, feuille, ciseaux"),
            story: lang.pick(
                "A majority prefers Ada to Bea (6–3), a majority prefers Bea to Cal (7–2), and a \
                        majority prefers Cal to Ada (5–4). Every candidate loses to somebody, so there is no \
                        Condorcet winner. In an agenda of duels, whoever enters last wins.",
                "Une majorité préfère Ada à Bea (6 à 3), une majorité préfère Bea à Cal (7 à 2), et une majorité \
                 préfère Cal à Ada (5 à 4). Chaque candidat perd contre quelqu’un : il n’y a pas de vainqueur de \
                 Condorcet. Dans une série de duels selon un ordre du jour, le dernier à entrer en lice gagne.",
            ),
            methods: vec![Agenda, Copeland, Minimax, Schulze, RankedPairs, Irv],
            election: Election::named(3).with(4, &[0, 1, 2]).with(3, &[1, 2, 0]).with(2, &[2, 0, 1]),
        },
        Scenario {
            id: "condorcet_burying",
            title: lang.pick("Burying the Condorcet winner", "Enterrer le vainqueur de Condorcet"),
            story: lang.pick(
                "Ada is the Condorcet winner, beating Bea 20–15 and Cal 25–10. Bea's 15 supporters \
                        honestly rank Ada second. If 11 or more of them rank Ada last instead, Cal beats Ada \
                        (21–14 or more), the majorities go round in a cycle, and its weakest link becomes \
                        Ada's 20–15 win over Bea. Schulze, ranked pairs and minimax all break the cycle \
                        there, and Bea wins.",
                "Ada est vainqueur de Condorcet : 20 à 15 contre Bea et 25 à 10 contre Cal. Les 15 partisans de Bea \
                 classent sincèrement Ada deuxième. Si 11 d’entre eux ou plus la classent plutôt dernière, Cal bat Ada \
                 (21 à 14 ou plus), les majorités tournent en rond, et le maillon le plus faible du cycle devient la \
                 victoire d’Ada sur Bea, 20 à 15. Schulze, les paires classées et le minimax brisent tous le cycle à \
                 cet endroit, et Bea gagne.",
            ),
            methods: vec![Schulze, RankedPairs, Minimax, Copeland],
            election: Election::named(3).with(10, &[0, 1, 2]).with(10, &[2, 0, 1]).with(15, &[1, 0, 2]),
        },
        Scenario {
            id: "borda_burying",
            title: lang.pick("Burying under Borda", "Enterrer sous Borda"),
            story: lang.pick(
                "Honestly, Ada scores 140 Borda points to Bea's 130. If Bea's 40 voters move Ada from \
                        second place to last, below hopeless Cal, Ada falls to 100 and Bea wins with 130.",
                "Sincèrement, Ada obtient 140 points de Borda contre 130 pour Bea. Si les 40 électeurs de Bea font \
                        passer Ada de la deuxième à la dernière place, derrière Cal qui n’a aucune chance, Ada tombe à \
                        100 et Bea gagne avec 130.",
            ),
            methods: vec![Borda, Plurality, Schulze],
            election: Election::named(3).with(50, &[0, 1, 2]).with(40, &[1, 0, 2]),
        },
        Scenario {
            id: "borda_teaming",
            title: lang.pick("Teaming with a clone", "Faire équipe avec un clone"),
            story: lang.pick(
                "Between Ada and Bea alone, Ada wins 30–20. Bea's party adds Bex, a near-copy of Bea \
                        that everyone ranks right next to Bea. Bex wins nothing, but pushes Ada down \
                        the ballots of Bea's supporters, and Bea now wins the Borda count 70 to 60.",
                "Entre Ada et Bea seules, Ada gagne 30 à 20. Le parti de Bea ajoute Bex, un quasi-clone de Bea que \
                        tout le monde classe juste à côté de Bea. Bex ne gagne rien, mais repousse Ada vers le bas des \
                        bulletins des partisans de Bea, et Bea remporte désormais la méthode de Borda, 70 à 60.",
            ),
            methods: vec![Borda, Irv, Schulze],
            election: Election::new(["Ada", "Bea", "Bex"]).with(30, &[0, 1, 2]).with(20, &[1, 2, 0]),
        },
    ]
}

pub fn get(id: &str) -> Option<Scenario> {
    get_in(id, Lang::En)
}

pub fn get_in(id: &str, lang: Lang) -> Option<Scenario> {
    all_in(lang).into_iter().find(|s| s.id == id)
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

    /// Every claim the journey makes about Riverton. Groups: 0 Lucas, 1 Léo,
    /// 2 Aïda, 3 Clélia, 4 Robinson. Candidates: 0 Cuauhtémoc, 1 Manu, 2 Melon,
    /// 3 Poutine, 4 Duck.
    mod riverton {
        use super::*;
        use crate::manipulation::find_manipulations;

        const CUAUHTEMOC: usize = 0;
        const MANU: usize = 1;
        const MELON: usize = 2;
        const POUTINE: usize = 3;
        const DUCK: usize = 4;

        fn e() -> Election {
            super::super::riverton()
        }

        fn with_ballot(e: &Election, group: usize, voters: u32, ranking: &[usize]) -> Election {
            switch_voters(e, group, voters, &Ballot::from_ranking(ranking.to_vec(), e.max_score))
        }

        fn staying_home(e: &Election, group: usize, voters: u32) -> Election {
            let mut a = e.clone();
            a.ballots[group].weight -= voters;
            a
        }

        #[test]
        fn five_systems_five_mayors() {
            let e = e();
            assert_eq!(e.total_weight(), 30);
            assert_eq!(winner(Plurality, &e), "Duck");
            assert_eq!(winner(TwoRound, &e), "Cuauhtémoc");
            assert_eq!(winner(Irv, &e), "Poutine");
            assert_eq!(winner(Borda, &e), "Melon");
            for m in [Schulze, RankedPairs, Minimax, Copeland, Agenda] {
                assert_eq!(winner(m, &e), "Manu", "{m}");
            }
            assert_eq!(winner(Approval, &e), "Manu");
            assert_eq!(winner(Score, &e), "Melon");
            assert_eq!(winner(Star, &e), "Manu");
        }

        #[test]
        fn counts() {
            let e = e();
            assert_eq!(Plurality.run(&e).rounds[0].tallies, [7.0, 3.0, 6.0, 5.0, 9.0].map(Some));
            assert_eq!(TwoRound.run(&e).rounds[1].tallies, [Some(16.0), None, None, None, Some(14.0)]);
            let irv = Irv.run(&e);
            let out: Vec<usize> = irv.rounds.iter().flat_map(|r| r.eliminated.clone()).collect();
            assert_eq!(out, vec![MANU, MELON, CUAUHTEMOC]);
            assert_eq!(irv.rounds.last().unwrap().tallies[POUTINE], Some(21.0));
            assert_eq!(Borda.run(&e).rounds[0].tallies, [45.0, 72.0, 74.0, 63.0, 46.0].map(Some));
            assert_eq!(Approval.run(&e).rounds[0].tallies, [7.0, 19.0, 11.0, 14.0, 9.0].map(Some));
            let star = Star.run(&e);
            assert_eq!(star.rounds[0].tallies, [55.0, 97.0, 101.0, 77.0, 60.0].map(Some));
            assert_eq!(star.rounds[1].tallies[MANU], Some(19.0));
        }

        #[test]
        fn head_to_head() {
            let pm = PairwiseMatrix::new(&e());
            assert_eq!(pm.condorcet_winner(), Some(MANU));
            assert_eq!(pm.condorcet_loser(), Some(DUCK));
            assert_eq!(
                [CUAUHTEMOC, MELON, POUTINE, DUCK].map(|c| (pm.prefer(MANU, c), pm.prefer(c, MANU))),
                [(18, 12), (19, 11), (19, 11), (16, 14)]
            );
            // Duck is last on 16 of the 30 ballots.
            assert_eq!(e().ballots.iter().filter(|b| b.ranking[4] == DUCK).map(|b| b.weight).sum::<u32>(), 16);
        }

        #[test]
        fn plurality_pitfalls() {
            let e = e();
            // Compromise: Léo's group votes Manu, or Robinson's votes Cuauhtémoc.
            assert_eq!(winner(Plurality, &with_ballot(&e, 1, 7, &[1, 0, 2, 3, 4])), "Manu");
            assert_eq!(winner(Plurality, &with_ballot(&e, 4, 3, &[0, 1, 3, 2, 4])), "Cuauhtémoc");
            // Spoilers.
            let without = |c: usize| {
                let keep: Vec<usize> = (0..5).filter(|&x| x != c).collect();
                let r = e.restrict(&keep);
                keep[Plurality.run(&r).winner]
            };
            assert_eq!(without(CUAUHTEMOC), MANU);
            assert_eq!(without(MELON), POUTINE);
            assert_eq!(without(POUTINE), MELON);
            assert_eq!(without(MANU), DUCK);
        }

        #[test]
        fn two_round_pitfalls() {
            let e = e();
            // Four of Lucas's group put Cuauhtémoc first, and Cuauhtémoc loses to Melon.
            let converts = with_ballot(&e, 0, 4, &[CUAUHTEMOC, DUCK, MANU, MELON, POUTINE]);
            assert_eq!(winner(TwoRound, &converts), "Melon");
            // Four of Lucas's group stay home: Melon, whom Lucas prefers to Cuauhtémoc.
            assert_eq!(winner(TwoRound, &staying_home(&e, 0, 4)), "Melon");
            // Robinson's group backs Poutine in round one: Poutine, whom they prefer to Cuauhtémoc.
            assert_eq!(winner(TwoRound, &with_ballot(&e, 4, 3, &[POUTINE, CUAUHTEMOC, MANU, MELON, DUCK])), "Poutine");
        }

        #[test]
        fn instant_runoff_pitfalls() {
            let e = e();
            // Two of Léo's group put Poutine first, and Poutine loses to Melon.
            assert_eq!(winner(Irv, &with_ballot(&e, 1, 2, &[POUTINE, CUAUHTEMOC, MANU, MELON, DUCK])), "Melon");
            // Staying home: Lucas's and Léo's groups both prefer Melon to Poutine.
            assert_eq!(winner(Irv, &staying_home(&e, 0, 4)), "Melon");
            assert_eq!(winner(Irv, &staying_home(&e, 1, 2)), "Melon");
            // Three more people like Robinson turn up and get Melon, whom they like less than Poutine.
            let mut more = e.clone();
            more.ballots[4].weight += 3;
            assert_eq!(winner(Irv, &more), "Melon");
        }

        #[test]
        fn borda_pitfalls() {
            let e = e();
            // Robinson's group buries Melon.
            assert_eq!(winner(Borda, &with_ballot(&e, 4, 3, &[MANU, CUAUHTEMOC, POUTINE, DUCK, MELON])), "Manu");
            // Teaming: Manu's party fields a near-copy that every voter ranks just below
            // Manu. The copy wins nothing, but Manu now wins the Borda count.
            let teamed = crate::criteria::with_clones(&e, MANU, 1, 1);
            assert_eq!(winner(Borda, &teamed), "Manu");
            assert_eq!(winner(Irv, &teamed), "Poutine", "instant runoff is not fooled");
        }

        #[test]
        fn condorcet_pitfalls() {
            let e = e();
            // Aïda's group buries Manu, fakes a cycle and wins.
            let buried = with_ballot(&e, 2, 6, &[MELON, CUAUHTEMOC, POUTINE, DUCK, MANU]);
            assert!(PairwiseMatrix::new(&buried).condorcet_winner().is_none());
            for m in [Schulze, RankedPairs, Minimax] {
                assert_eq!(winner(m, &buried), "Melon", "{m}");
            }
        }

        #[test]
        fn rated_pitfalls() {
            let e = e();
            // A bullet vote by Lucas's or Léo's group backfires: Poutine, ranked fourth by both.
            for g in [0, 1] {
                let mut bullet = e.clone();
                let top = bullet.ballots[g].ranking[0];
                bullet.ballots[g].approvals = (0..5).map(|c| c == top).collect();
                assert_eq!(winner(Approval, &bullet), "Poutine");
            }
            // Under STAR, Aïda's group exaggerates and gets Poutine, whom they prefer to Manu.
            let star = find_manipulations(&e, Star, 50);
            assert!(star.iter().any(|m| m.group == 2 && m.voters == 6 && m.new_winner == POUTINE));
            // Approval cannot be manipulated by any group here.
            assert!(find_manipulations(&e, Approval, 50).is_empty());
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
