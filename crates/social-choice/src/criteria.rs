//! Fairness criteria, which methods meet them, and a search for elections that
//! show a method breaking one.
//!
//! Criteria are judged against the voters' full rankings. Rated ballots (approvals
//! and scores) are honest but coarser than rankings, which is why, for example, a
//! majority's favourite can lose an approval vote.

use crate::election::{all_rankings, Ballot, CandidateId, Election, MAX_CANDIDATES};
use crate::methods::{BallotKind, Method};
use crate::outcome::Outcome;
use crate::pairwise::PairwiseMatrix;
use crate::random::{random_election, Rng};
use crate::text::{describe_ballot, voters};
use serde::{Deserialize, Serialize};

/// A property a fair voting method might be expected to have.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Criterion {
    Majority,
    CondorcetWinner,
    CondorcetLoser,
    Pareto,
    Monotonicity,
    Participation,
    Iia,
    Clones,
}

impl Criterion {
    pub const ALL: [Criterion; 8] = [
        Criterion::Majority,
        Criterion::CondorcetWinner,
        Criterion::CondorcetLoser,
        Criterion::Pareto,
        Criterion::Monotonicity,
        Criterion::Participation,
        Criterion::Iia,
        Criterion::Clones,
    ];

    pub fn id(self) -> &'static str {
        match self {
            Criterion::Majority => "majority",
            Criterion::CondorcetWinner => "condorcet_winner",
            Criterion::CondorcetLoser => "condorcet_loser",
            Criterion::Pareto => "pareto",
            Criterion::Monotonicity => "monotonicity",
            Criterion::Participation => "participation",
            Criterion::Iia => "iia",
            Criterion::Clones => "clones",
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Criterion::Majority => "Majority",
            Criterion::CondorcetWinner => "Condorcet winner",
            Criterion::CondorcetLoser => "Condorcet loser",
            Criterion::Pareto => "Unanimity (Pareto)",
            Criterion::Monotonicity => "Monotonicity",
            Criterion::Participation => "Participation",
            Criterion::Iia => "Independence of irrelevant alternatives",
            Criterion::Clones => "Independence of clones",
        }
    }

    /// The criterion as a yes/no question about a method.
    pub fn question(self) -> &'static str {
        match self {
            Criterion::Majority => "If more than half the voters rank X first, does X always win?",
            Criterion::CondorcetWinner => "If X beats every rival head to head, does X always win?",
            Criterion::CondorcetLoser => "Is the candidate who loses every head-to-head contest never elected?",
            Criterion::Pareto => "If every voter prefers X to Y, is Y never elected?",
            Criterion::Monotonicity => "Can ranking the winner higher never make them lose?",
            Criterion::Participation => "Is voting always better for you than staying home?",
            Criterion::Iia => "Does dropping a losing candidate never change the winner?",
            Criterion::Clones => "Does adding a near-copy of a candidate never change the winner?",
        }
    }

    pub fn description(self) -> &'static str {
        match self {
            Criterion::Majority => {
                "A candidate who is the first choice of a majority should win. Plurality and every runoff \
                 method guarantee it; Borda and the rated methods do not, because the majority's \
                 second choices can add up to more."
            }
            Criterion::CondorcetWinner => {
                "The Condorcet winner beats every other candidate in a one-on-one majority vote. Methods \
                 that always elect this candidate when one exists are called Condorcet methods."
            }
            Criterion::CondorcetLoser => {
                "The Condorcet loser loses every one-on-one vote. Electing them means a majority \
                 preferred each of the other candidates."
            }
            Criterion::Pareto => {
                "If literally everyone agrees that X is better than Y, the method should not pick Y. \
                 This is the unanimity condition in Arrow's theorem."
            }
            Criterion::Monotonicity => {
                "Gaining support should never hurt. A method fails if some voters can move the winner \
                 up their ballots and thereby make the winner lose."
            }
            Criterion::Participation => {
                "Showing up and voting honestly should never produce a result you like less than the \
                 one you would get by abstaining. Failing this is the no-show paradox."
            }
            Criterion::Iia => {
                "Withdrawing a candidate who was going to lose should not change who wins. Failing \
                 this is the spoiler effect. In Arrow's theorem the condition is about the whole \
                 social ranking: how society ranks X against Y should depend only on how voters \
                 rank X against Y."
            }
            Criterion::Clones => {
                "Adding a candidate almost identical to an existing one (every voter ranks the two \
                 side by side) should not change the winner, apart from possibly handing the win \
                 to one of the twins. Failing this lets parties win by running look-alikes \
                 (teaming) or lose to them (vote splitting)."
            }
        }
    }
}

impl std::str::FromStr for Criterion {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Criterion::ALL.into_iter().find(|c| c.id() == s).ok_or_else(|| format!("unknown criterion `{s}`"))
    }
}

/// Whether `method` satisfies `criterion` as defined in this module.
///
/// The table follows the social choice literature; the test suite backs it by
/// searching for counterexamples to every "no" and failing to find any to a "yes".
pub fn satisfies(method: Method, criterion: Criterion) -> bool {
    use Method::*;
    match criterion {
        Criterion::Majority => {
            matches!(method, Plurality | TwoRound | Irv | Coombs | Agenda | Copeland | Minimax | Schulze | RankedPairs)
        }
        Criterion::CondorcetWinner => matches!(method, Agenda | Copeland | Minimax | Schulze | RankedPairs),
        Criterion::CondorcetLoser => {
            matches!(method, TwoRound | Irv | Coombs | Borda | Agenda | Copeland | Schulze | RankedPairs)
        }
        Criterion::Pareto => method != Agenda,
        Criterion::Monotonicity => !matches!(method, TwoRound | Irv | Coombs),
        Criterion::Participation => {
            matches!(method, Plurality | AntiPlurality | Borda | Approval | Score | Dictatorship)
        }
        Criterion::Iia => matches!(method, Approval | Score | Dictatorship),
        Criterion::Clones => matches!(method, Irv | Schulze | RankedPairs | Approval | Score | Dictatorship),
    }
}

/// An election (or a pair of them) showing a method breaking a criterion.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Counterexample {
    pub criterion: Criterion,
    pub method: Method,
    pub before: Election,
    pub before_outcome: Outcome,
    /// The changed election, for criteria about what happens when ballots change.
    pub after: Option<Election>,
    pub after_outcome: Option<Outcome>,
    pub explanation: String,
}

/// Checks a single election. Returns a counterexample if `method` breaks
/// `criterion` on it (or on an election derived from it). Elections whose result
/// depends on a tie-break are skipped, so every counterexample is clear-cut.
pub fn check(method: Method, criterion: Criterion, e: &Election) -> Option<Counterexample> {
    let before = method.run(e);
    if before.used_tiebreak || e.ballots.iter().all(|b| b.weight == 0) {
        return None;
    }
    let w = before.winner;
    let (after, explanation) = match criterion {
        Criterion::Majority => majority(method, e, w)?,
        Criterion::CondorcetWinner => condorcet_winner(method, e, w)?,
        Criterion::CondorcetLoser => condorcet_loser(method, e, w)?,
        Criterion::Pareto => pareto(method, e, w)?,
        Criterion::Monotonicity => monotonicity(method, e, w)?,
        Criterion::Participation => participation(method, e, w)?,
        Criterion::Iia => iia(method, e, w)?,
        Criterion::Clones => clones(method, e, w)?,
    };
    let after_outcome = after.as_ref().map(|a| method.run(a));
    Some(Counterexample {
        criterion,
        method,
        before: e.clone(),
        before_outcome: before,
        after,
        after_outcome,
        explanation,
    })
}

/// Shapes of random election tried in turn: (candidates, fewest blocs, most
/// blocs, largest bloc). Some failures only show up with four or five candidates
/// and many blocs, others are easier to spot in small elections.
const SHAPES: [(usize, u64, u64, u32); 6] =
    [(3, 2, 6, 9), (4, 2, 6, 9), (4, 4, 8, 12), (5, 3, 7, 5), (3, 3, 5, 3), (5, 2, 4, 3)];

/// Searches random elections for a counterexample and shrinks the first one found
/// so it is easy to read. Deterministic for a given seed.
pub fn find_counterexample(method: Method, criterion: Criterion, seed: u64, attempts: usize) -> Option<Counterexample> {
    let mut rng = Rng::new(seed ^ ((method as u64) << 32) ^ ((criterion as u64) << 16));
    for i in 0..attempts {
        let (n, fewest, most, largest) = SHAPES[i % SHAPES.len()];
        let groups = rng.range(fewest, most) as usize;
        let e = random_election(&mut rng, n, groups, largest);
        if check(method, criterion, &e).is_some() {
            return check(method, criterion, &shrink(method, criterion, e));
        }
    }
    None
}

/// Removes voters one at a time (halving big blocs first) while the
/// counterexample survives.
fn shrink(method: Method, criterion: Criterion, mut e: Election) -> Election {
    let mut budget = 60;
    'outer: while budget > 0 {
        for g in 0..e.ballots.len() {
            let w = e.ballots[g].weight;
            for smaller_weight in [w / 2, w - 1] {
                if smaller_weight == w || budget == 0 {
                    continue;
                }
                budget -= 1;
                let mut smaller = e.clone();
                if smaller_weight == 0 {
                    smaller.ballots.remove(g);
                } else {
                    smaller.ballots[g].weight = smaller_weight;
                }
                if !smaller.ballots.is_empty() && check(method, criterion, &smaller).is_some() {
                    e = smaller;
                    continue 'outer;
                }
            }
        }
        break;
    }
    e
}

type Found = Option<(Option<Election>, String)>;

fn head_to_head_list(e: &Election, pm: &PairwiseMatrix, x: CandidateId) -> String {
    (0..e.num_candidates())
        .filter(|&y| y != x)
        .map(|y| format!("{} {}–{}", e.name(y), pm.prefer(x, y), pm.prefer(y, x)))
        .collect::<Vec<_>>()
        .join(", ")
}

fn majority(method: Method, e: &Election, w: CandidateId) -> Found {
    let total = e.total_weight();
    let mut first = vec![0u64; e.num_candidates()];
    for b in &e.ballots {
        first[b.ranking[0]] += u64::from(b.weight);
    }
    let x = (0..first.len()).find(|&c| 2 * first[c] > total)?;
    (x != w).then(|| {
        let text = format!(
            "{} is the first choice of {} of the {} voters, a clear majority, yet {} elects {}.",
            e.name(x),
            first[x],
            total,
            method.name(),
            e.name(w)
        );
        (None, text)
    })
}

fn condorcet_winner(method: Method, e: &Election, w: CandidateId) -> Found {
    let pm = PairwiseMatrix::new(e);
    let x = pm.condorcet_winner()?;
    (x != w).then(|| {
        let text = format!(
            "{} beats every rival head to head ({}), yet {} elects {}.",
            e.name(x),
            head_to_head_list(e, &pm, x),
            method.name(),
            e.name(w)
        );
        (None, text)
    })
}

fn condorcet_loser(method: Method, e: &Election, w: CandidateId) -> Found {
    let pm = PairwiseMatrix::new(e);
    let l = pm.condorcet_loser()?;
    (l == w).then(|| {
        let text = format!(
            "{} loses every head-to-head contest ({}), yet {} elects {}.",
            e.name(l),
            head_to_head_list(e, &pm, l),
            method.name(),
            e.name(l)
        );
        (None, text)
    })
}

fn pareto(method: Method, e: &Election, w: CandidateId) -> Found {
    let x = (0..e.num_candidates())
        .find(|&x| x != w && e.ballots.iter().filter(|b| b.weight > 0).all(|b| b.prefers(x, w)))?;
    let text = format!(
        "Every single voter ranks {} above {}, yet {} elects {}.",
        e.name(x),
        e.name(w),
        method.name(),
        e.name(w)
    );
    Some((None, text))
}

/// Voter counts worth trying when only part of a bloc changes its ballot: every
/// count for blocs up to 64 voters, a coarse ladder above that.
pub(crate) fn weight_steps(weight: u32) -> Vec<u32> {
    if weight <= 64 {
        (1..=weight).collect()
    } else {
        let mut steps: Vec<u32> =
            vec![1, 2, 3, 4, 6, 8, 12, 16, 24, 32, weight / 4, weight / 2, 3 * weight / 4, weight];
        steps.retain(|&s| s >= 1 && s <= weight);
        steps.sort_unstable();
        steps.dedup();
        steps
    }
}

/// The election with `k` of the voters in bloc `g` switched to `ballot`.
pub(crate) fn switch_voters(e: &Election, g: usize, k: u32, ballot: &Ballot) -> Election {
    let mut out = e.clone();
    let switched = ballot.clone().weighted(k);
    if k >= out.ballots[g].weight {
        out.ballots[g] = switched;
    } else {
        out.ballots[g].weight -= k;
        out.ballots.insert(g + 1, switched);
    }
    out
}

fn raised(b: &Ballot, w: CandidateId, max_score: u32, kind: BallotKind) -> Vec<Ballot> {
    let mut out = Vec::new();
    match kind {
        BallotKind::Approval => {
            if !b.approvals[w] {
                let mut r = b.clone();
                r.approvals[w] = true;
                out.push(r);
            }
        }
        BallotKind::Score => {
            for target in [b.scores[w] + 1, max_score] {
                if target <= max_score && target > b.scores[w] && out.len() < 2 {
                    let mut r = b.clone();
                    r.scores[w] = target;
                    if !out.contains(&r) {
                        out.push(r);
                    }
                }
            }
        }
        BallotKind::ChooseOne | BallotKind::Veto | BallotKind::Ranked => {
            let p = b.position(w);
            if p > 0 {
                let mut one_up = b.clone();
                one_up.ranking.swap(p - 1, p);
                out.push(one_up);
            }
            if p > 1 {
                let mut top = b.clone();
                top.ranking.remove(p);
                top.ranking.insert(0, w);
                out.push(top);
            }
        }
    }
    out
}

fn monotonicity(method: Method, e: &Election, w: CandidateId) -> Found {
    let kind = method.ballot_kind();
    for (g, b) in e.ballots.iter().enumerate() {
        for better in raised(b, w, e.max_score, kind) {
            for k in weight_steps(b.weight) {
                let after = switch_voters(e, g, k, &better);
                let out = method.run(&after);
                if out.is_decisive() && out.winner != w {
                    let text = format!(
                        "{} wins. Then {} who voted {} give {} more support and vote {} instead. \
                         Now {} wins: more support made {} lose.",
                        e.name(w),
                        voters(u64::from(k)),
                        describe_ballot(e, b, kind),
                        e.name(w),
                        describe_ballot(e, &better, kind),
                        e.name(out.winner),
                        e.name(w)
                    );
                    return Some((Some(after), text));
                }
            }
        }
    }
    None
}

fn participation(method: Method, e: &Election, w: CandidateId) -> Found {
    let kind = method.ballot_kind();
    let n = e.num_candidates();
    let mut templates: Vec<Ballot> = if n <= 5 {
        all_rankings(n).into_iter().map(|r| Ballot::from_ranking(r, e.max_score)).collect()
    } else {
        Vec::new()
    };
    templates.extend(e.ballots.iter().map(|b| b.clone().weighted(1)));
    for t in &templates {
        for k in [1, 2, 3, 4, 5, 6, 8, 10] {
            let mut after = e.clone();
            after.push(t.clone().weighted(k));
            let out = method.run(&after);
            if out.is_decisive() && out.winner != w && t.prefers(w, out.winner) {
                let y = out.winner;
                let arrive = if k == 1 {
                    "1 more voter turns up and votes".to_string()
                } else {
                    format!("{k} more voters turn up and vote")
                };
                let text = format!(
                    "{} wins. Then {} {}. They prefer {} to {}, but their ballots make {} win: they \
                     would have done better staying home.",
                    e.name(w),
                    arrive,
                    describe_ballot(e, t, kind),
                    e.name(w),
                    e.name(y),
                    e.name(y)
                );
                return Some((Some(after), text));
            }
        }
    }
    None
}

fn iia(method: Method, e: &Election, w: CandidateId) -> Found {
    for c in (0..e.num_candidates()).filter(|&c| c != w) {
        let keep: Vec<CandidateId> = (0..e.num_candidates()).filter(|&x| x != c).collect();
        let after = e.restrict(&keep);
        let out = method.run(&after);
        if out.is_decisive() && keep[out.winner] != w {
            let text = format!(
                "{} wins. Then {}, who was losing anyway, drops out. Count the very same ballots again \
                 and {} wins.",
                e.name(w),
                e.name(c),
                e.name(keep[out.winner])
            );
            return Some((Some(after), text));
        }
    }
    None
}

/// Adds `copies` near-copies of candidate `c` (one or two). Every voter ranks the
/// whole family side by side; `pattern` varies the order inside the family from
/// ballot to ballot. Copies placed below the original may score one point less.
pub fn with_clones(e: &Election, c: CandidateId, copies: usize, pattern: usize) -> Election {
    let n = e.num_candidates();
    let mut out = e.clone();
    for k in 0..copies {
        out.candidates.push(format!("{}{}", e.name(c), ["′", "″"][k.min(1)]));
    }
    for (i, b) in out.ballots.iter_mut().enumerate() {
        let family: Vec<CandidateId> = std::iter::once(c).chain(n..n + copies).collect();
        // Rotate the family, or for a single copy put it above or below `c`.
        let order: Vec<CandidateId> = if copies == 1 {
            let above = match pattern % 4 {
                0 => true,
                1 => false,
                2 => i % 2 == 0,
                _ => i % 2 == 1,
            };
            if above {
                vec![n, c]
            } else {
                vec![c, n]
            }
        } else {
            let r = (i + pattern) % family.len();
            family[r..].iter().chain(&family[..r]).copied().collect()
        };
        let p = b.position(c);
        let next = b.ranking.get(p + 1).map_or(0, |&d| b.scores[d]);
        let original = b.scores[c];
        let below = order.iter().position(|&x| x == c).unwrap_or(0);
        b.ranking.splice(p..=p, order.iter().copied());
        b.approvals.extend(std::iter::repeat_n(b.approvals[c], copies));
        b.scores.resize(n + copies, 0);
        for (slot, &member) in order.iter().enumerate() {
            b.scores[member] = if slot <= below { original } else { original.saturating_sub(1).max(next) };
        }
    }
    out
}

fn clones(method: Method, e: &Election, w: CandidateId) -> Found {
    let n = e.num_candidates();
    let variants = (0..4).map(|p| (1, p)).chain((0..3).map(|p| (2, p)));
    for (copies, pattern) in variants {
        if n + copies > MAX_CANDIDATES {
            continue;
        }
        for c in 0..n {
            let after = with_clones(e, c, copies, pattern);
            let out = method.run(&after);
            let fine = out.winner == w || (w == c && out.winner >= n);
            if out.is_decisive() && !fine {
                let copies_text = if copies == 1 {
                    format!(
                        "{}, a near-copy of {} that every voter ranks right next to {}, joins",
                        after.name(n),
                        e.name(c),
                        e.name(c)
                    )
                } else {
                    format!(
                        "{} and {}, two near-copies of {} that every voter ranks right next to {}, join",
                        after.name(n),
                        after.name(n + 1),
                        e.name(c),
                        e.name(c)
                    )
                };
                let text =
                    format!("{} wins. Then {} the race. Now {} wins.", e.name(w), copies_text, after.name(out.winner));
                return Some((Some(after), text));
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spots_the_spoiler() {
        let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]);
        // Bea and Cal are both spoilers: without Bea, Cal wins; without Cal, Bea wins.
        let cx = check(Method::Plurality, Criterion::Iia, &e).unwrap();
        assert_eq!(cx.after.unwrap().candidates, vec!["Ada", "Cal"]);
        assert!(check(Method::Schulze, Criterion::CondorcetWinner, &e).is_none());
        assert!(check(Method::Plurality, Criterion::CondorcetWinner, &e).is_some());
    }

    #[test]
    fn clone_is_adjacent_everywhere() {
        let e = Election::named(3).with(2, &[0, 1, 2]).with(1, &[2, 1, 0]);
        let cloned = with_clones(&e, 1, 1, 2).complete().unwrap();
        assert_eq!(cloned.ballots[0].ranking, vec![0, 3, 1, 2]);
        assert_eq!(cloned.ballots[1].ranking, vec![2, 1, 3, 0]);
        let family = with_clones(&e, 0, 2, 1).complete().unwrap();
        assert_eq!(family.candidates, vec!["Ada", "Bea", "Cal", "Ada′", "Ada″"]);
        assert_eq!(family.ballots[0].ranking, vec![3, 4, 0, 1, 2]);
        assert_eq!(family.ballots[1].ranking, vec![2, 1, 4, 0, 3]);
        // Copies ranked below the original may lose a point, never more.
        assert_eq!(family.ballots[0].scores, vec![5, 3, 0, 5, 5]);
    }

    /// The heart of the module: for every method and criterion, the table and a
    /// brute-force search must agree.
    #[test]
    fn table_matches_search() {
        let mut disagreements = Vec::new();
        for method in Method::ALL {
            for criterion in Criterion::ALL {
                let expected = satisfies(method, criterion);
                // Debug builds are slow, so they only spot-check the "yes" entries.
                let attempts = match (expected, cfg!(debug_assertions)) {
                    (true, true) => 60,
                    (true, false) => 1500,
                    (false, _) => 40_000,
                };
                let found = find_counterexample(method, criterion, 2024, attempts);
                if expected == found.is_some() {
                    disagreements.push(format!(
                        "{} / {}: table says {}, search {}",
                        method.id(),
                        criterion.id(),
                        expected,
                        found.map_or("found nothing".to_string(), |c| c.explanation)
                    ));
                }
            }
        }
        assert!(disagreements.is_empty(), "\n{}", disagreements.join("\n"));
    }
}
