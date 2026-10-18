//! Arrow's impossibility theorem, checked by brute force.
//!
//! A *social welfare function* turns any list of voter rankings (a profile) into a
//! ranking for society. Arrow proved that with three or more candidates, no such
//! function can at once
//!
//! 1. accept every possible profile and always return a complete, transitive ranking,
//! 2. respect unanimity: if every voter prefers X to Y, so does society (Pareto),
//! 3. rank X against Y using only how voters rank X against Y (independence of
//!    irrelevant alternatives), and
//! 4. avoid having a dictator, one voter whose every strict preference society copies.
//!
//! With three candidates and a few voters there are only `6^voters` profiles, so
//! [`check_arrow`] simply tries them all and reports which conditions a rule breaks,
//! with a concrete example of each failure.

use crate::election::{all_rankings, Ballot, CandidateId, Election, DEFAULT_MAX_SCORE};
use crate::methods::Method;
use crate::pairwise::PairwiseMatrix;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::HashMap;
use std::fmt;

/// Most voters [`check_arrow`] will enumerate (6⁴ = 1296 profiles).
pub const MAX_ARROW_VOTERS: usize = 4;

/// A way of turning profiles into social rankings.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub enum Rule {
    /// Rank candidates the way a voting method ranks them.
    Method(Method),
    /// Society prefers X to Y when a majority does. Not always transitive.
    PairwiseMajority,
}

impl Rule {
    pub fn id(self) -> &'static str {
        match self {
            Rule::Method(m) => m.id(),
            Rule::PairwiseMajority => "pairwise_majority",
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Rule::Method(m) => m.name(),
            Rule::PairwiseMajority => "Pairwise majority",
        }
    }

    /// Every rule: each voting method plus pairwise majority.
    pub fn all() -> Vec<Rule> {
        Method::ALL.into_iter().map(Rule::Method).chain([Rule::PairwiseMajority]).collect()
    }
}

impl fmt::Display for Rule {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.name())
    }
}

impl From<Rule> for String {
    fn from(rule: Rule) -> String {
        rule.id().to_string()
    }
}

impl TryFrom<String> for Rule {
    type Error = String;

    fn try_from(s: String) -> Result<Self, Self::Error> {
        if s == "pairwise_majority" {
            Ok(Rule::PairwiseMajority)
        } else {
            s.parse::<Method>().map(Rule::Method).map_err(|e| e.to_string())
        }
    }
}

/// One profile and what the rule made of it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Profile {
    /// Each voter's ranking, best first.
    pub ballots: Vec<Vec<CandidateId>>,
    /// Society's ranking in tiers, or `None` when the rule produced no ranking
    /// (a majority cycle).
    pub social: Option<Vec<Vec<CandidateId>>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TransitivityViolation {
    pub profile: Profile,
    /// Each candidate is socially at least as good as the next, and the last is
    /// strictly better than the first.
    pub cycle: Vec<CandidateId>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParetoViolation {
    pub profile: Profile,
    /// Every voter ranks `better` above `worse`, but society does not.
    pub better: CandidateId,
    pub worse: CandidateId,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct IiaViolation {
    /// The pair whose social ranking flips.
    pub a: CandidateId,
    pub b: CandidateId,
    /// Two profiles in which every voter ranks `a` against `b` the same way...
    pub first: Profile,
    /// ...but society ranks them differently.
    pub second: Profile,
    /// Voters whose ballots differ between the two profiles.
    pub changed_voters: Vec<usize>,
}

/// Which of Arrow's conditions a rule breaks, with an example of each failure.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ArrowReport {
    pub rule: Rule,
    pub candidates: Vec<String>,
    pub voters: usize,
    /// How many profiles were checked.
    pub profiles: usize,
    pub transitivity: Option<TransitivityViolation>,
    pub pareto: Option<ParetoViolation>,
    pub iia: Option<IiaViolation>,
    /// The voter society always agrees with, if there is one.
    pub dictator: Option<usize>,
}

impl ArrowReport {
    /// True when the rule meets every condition except, possibly, non-dictatorship.
    pub fn is_arrow_fair_but_dictatorial(&self) -> bool {
        self.transitivity.is_none() && self.pareto.is_none() && self.iia.is_none() && self.dictator.is_some()
    }

    /// Number of Arrow's conditions (transitivity, Pareto, IIA, non-dictatorship) met.
    pub fn conditions_met(&self) -> usize {
        [self.transitivity.is_none(), self.pareto.is_none(), self.iia.is_none(), self.dictator.is_none()]
            .iter()
            .filter(|&&ok| ok)
            .count()
    }
}

/// Society's view of one profile.
enum Social {
    Ranking(Vec<Vec<CandidateId>>),
    Majority(PairwiseMatrix),
}

impl Social {
    /// `Greater` when society puts `a` above `b`.
    fn verdict(&self, a: CandidateId, b: CandidateId) -> Ordering {
        match self {
            Social::Ranking(tiers) => {
                let tier = |c| tiers.iter().position(|t: &Vec<CandidateId>| t.contains(&c));
                tier(b).cmp(&tier(a))
            }
            Social::Majority(pm) => pm.prefer(a, b).cmp(&pm.prefer(b, a)),
        }
    }

    /// A broken chain of the "at least as good as" relation, if any.
    fn intransitive_triple(&self, n: usize) -> Option<Vec<CandidateId>> {
        let at_least = |a, b| self.verdict(a, b) != Ordering::Less;
        for a in 0..n {
            for b in (0..n).filter(|&b| b != a) {
                for c in (0..n).filter(|&c| c != a && c != b) {
                    if at_least(a, b) && at_least(b, c) && !at_least(a, c) {
                        return Some(vec![a, b, c]);
                    }
                }
            }
        }
        None
    }

    fn tiers(&self, n: usize) -> Option<Vec<Vec<CandidateId>>> {
        match self {
            Social::Ranking(tiers) => Some(tiers.clone()),
            Social::Majority(_) if self.intransitive_triple(n).is_some() => None,
            Social::Majority(pm) => {
                let score =
                    |a: CandidateId| (0..n).filter(|&b| b != a).map(|b| 1 + pm.margin(a, b).signum()).sum::<i64>();
                Some(crate::outcome::tiers_by(0..n, score))
            }
        }
    }
}

fn social(rule: Rule, ballots: &[Vec<CandidateId>]) -> Social {
    let mut e = Election::named(3);
    for r in ballots {
        e.push(Ballot::from_ranking(r.clone(), DEFAULT_MAX_SCORE));
    }
    match rule {
        Rule::Method(m) => Social::Ranking(m.run(&e).ranking),
        Rule::PairwiseMajority => Social::Majority(PairwiseMatrix::new(&e)),
    }
}

/// Checks `rule` against every profile of `voters` voters (clamped to
/// `1..=MAX_ARROW_VOTERS`) over three candidates.
pub fn check_arrow(rule: Rule, voters: usize) -> ArrowReport {
    const N: usize = 3;
    const PAIRS: [(CandidateId, CandidateId); 3] = [(0, 1), (0, 2), (1, 2)];
    let voters = voters.clamp(1, MAX_ARROW_VOTERS);
    let rankings = all_rankings(N);
    let count = rankings.len().pow(voters as u32);
    // decoded[p][v]: index (into `rankings`) of voter v's ballot in profile p.
    let decoded: Vec<Vec<usize>> = (0..count)
        .map(|mut p| {
            (0..voters)
                .map(|_| {
                    let r = p % rankings.len();
                    p /= rankings.len();
                    r
                })
                .collect()
        })
        .collect();
    let ballots_of = |p: usize| -> Vec<Vec<CandidateId>> { decoded[p].iter().map(|&r| rankings[r].clone()).collect() };
    let profile_of = |p: usize, s: &Social| Profile { ballots: ballots_of(p), social: s.tiers(N) };

    let mut transitivity = None;
    let mut pareto = None;
    let mut dictator_possible = vec![true; voters];
    // For each pair and each pattern of individual opinions on it, every
    // (profile, social verdict) seen.
    let mut by_pattern: HashMap<(usize, u32), Vec<(usize, Ordering)>> = HashMap::new();

    for p in 0..count {
        let ballots = ballots_of(p);
        let s = social(rule, &ballots);
        if transitivity.is_none() {
            if let Some(cycle) = s.intransitive_triple(N) {
                transitivity = Some(TransitivityViolation { profile: profile_of(p, &s), cycle });
            }
        }
        for (i, &(a, b)) in PAIRS.iter().enumerate() {
            let verdict = s.verdict(a, b);
            let mut pattern = 0u32;
            for (v, ballot) in ballots.iter().enumerate() {
                let a_first = ballot.iter().position(|&c| c == a) < ballot.iter().position(|&c| c == b);
                if a_first {
                    pattern |= 1 << v;
                }
                let wanted = if a_first { Ordering::Greater } else { Ordering::Less };
                if verdict != wanted {
                    dictator_possible[v] = false;
                }
            }
            let all = (1u32 << voters) - 1;
            if pareto.is_none() && (pattern == all || pattern == 0) {
                let (better, worse) = if pattern == all { (a, b) } else { (b, a) };
                if s.verdict(better, worse) != Ordering::Greater {
                    pareto = Some(ParetoViolation { profile: profile_of(p, &s), better, worse });
                }
            }
            by_pattern.entry((i, pattern)).or_default().push((p, verdict));
        }
    }

    // The most striking IIA violation: a strict flip if possible, between the
    // two most similar profiles.
    let mut best: Option<(bool, usize, usize, usize, usize)> = None; // (has tie, distance, pair, p, q)
    let mut keys: Vec<&(usize, u32)> = by_pattern.keys().collect();
    keys.sort();
    for key in keys {
        let seen = &by_pattern[key];
        for (i, &(p, vp)) in seen.iter().enumerate() {
            for &(q, vq) in &seen[i + 1..] {
                if vp == vq {
                    continue;
                }
                let has_tie = vp == Ordering::Equal || vq == Ordering::Equal;
                let distance = decoded[p].iter().zip(&decoded[q]).filter(|(x, y)| x != y).count();
                let candidate = (has_tie, distance, key.0, p, q);
                if best.is_none_or(|b| (candidate.0, candidate.1) < (b.0, b.1)) {
                    best = Some(candidate);
                }
            }
        }
    }
    let iia = best.map(|(_, _, pair, p, q)| {
        let (a, b) = PAIRS[pair];
        IiaViolation {
            a,
            b,
            first: profile_of(p, &social(rule, &ballots_of(p))),
            second: profile_of(q, &social(rule, &ballots_of(q))),
            changed_voters: (0..voters).filter(|&v| decoded[p][v] != decoded[q][v]).collect(),
        }
    });

    ArrowReport {
        rule,
        candidates: crate::election::DEFAULT_NAMES[..N].iter().map(|s| s.to_string()).collect(),
        voters,
        profiles: count,
        transitivity,
        pareto,
        iia,
        dictator: dictator_possible.iter().position(|&d| d),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dictatorship_meets_everything_but_non_dictatorship() {
        let report = check_arrow(Rule::Method(Method::Dictatorship), 3);
        assert_eq!(report.profiles, 216);
        assert!(report.is_arrow_fair_but_dictatorial());
        assert_eq!(report.dictator, Some(0));
    }

    #[test]
    fn pairwise_majority_is_only_intransitive() {
        let report = check_arrow(Rule::PairwiseMajority, 3);
        assert!(report.pareto.is_none());
        assert!(report.iia.is_none());
        assert!(report.dictator.is_none());
        let t = report.transitivity.expect("the Condorcet paradox");
        assert!(t.profile.social.is_none());
    }

    #[test]
    fn no_method_meets_all_conditions() {
        // Arrow's theorem, for three candidates and two to four voters.
        for voters in 2..=MAX_ARROW_VOTERS {
            for rule in Rule::all() {
                let report = check_arrow(rule, voters);
                assert!(report.conditions_met() < 4, "{rule} with {voters} voters");
            }
        }
    }

    #[test]
    fn iia_violation_is_genuine() {
        let report = check_arrow(Rule::Method(Method::Borda), 3);
        let v = report.iia.unwrap();
        for voter in 0..3 {
            let pos = |b: &Vec<CandidateId>, c| b.iter().position(|&x| x == c);
            let first = &v.first.ballots[voter];
            let second = &v.second.ballots[voter];
            assert_eq!(pos(first, v.a) < pos(first, v.b), pos(second, v.a) < pos(second, v.b));
        }
        assert_eq!(v.changed_voters.len(), 1, "Borda flips with a single changed ballot");
        let tier = |s: &Option<Vec<Vec<CandidateId>>>, c| s.as_ref().unwrap().iter().position(|t| t.contains(&c));
        assert_ne!(
            tier(&v.first.social, v.a).cmp(&tier(&v.first.social, v.b)),
            tier(&v.second.social, v.a).cmp(&tier(&v.second.social, v.b))
        );
    }

    #[test]
    fn rules_serialize_as_ids() {
        assert_eq!(serde_json::to_string(&Rule::PairwiseMajority).unwrap(), "\"pairwise_majority\"");
        let r: Rule = serde_json::from_str("\"ranked_pairs\"").unwrap();
        assert_eq!(r, Rule::Method(Method::RankedPairs));
    }
}
