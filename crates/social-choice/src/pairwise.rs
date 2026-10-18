//! Head-to-head comparisons: Condorcet winners and losers, the Smith set and
//! majority cycles.

use crate::election::{CandidateId, Election};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

/// For every pair of candidates, how many voters rank one above the other.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PairwiseMatrix {
    /// `prefer[a][b]` is the number of voters who rank `a` above `b`.
    pub prefer: Vec<Vec<u64>>,
}

impl PairwiseMatrix {
    /// Builds the matrix from the rankings on the ballots.
    pub fn new(election: &Election) -> Self {
        let n = election.num_candidates();
        let mut prefer = vec![vec![0u64; n]; n];
        for ballot in &election.ballots {
            let w = u64::from(ballot.weight);
            for (i, &a) in ballot.ranking.iter().enumerate() {
                for &b in &ballot.ranking[i + 1..] {
                    prefer[a][b] += w;
                }
            }
        }
        PairwiseMatrix { prefer }
    }

    pub fn len(&self) -> usize {
        self.prefer.len()
    }

    pub fn is_empty(&self) -> bool {
        self.prefer.is_empty()
    }

    /// Voters ranking `a` above `b`.
    pub fn prefer(&self, a: CandidateId, b: CandidateId) -> u64 {
        self.prefer[a][b]
    }

    /// How many more voters prefer `a` to `b` than the reverse.
    pub fn margin(&self, a: CandidateId, b: CandidateId) -> i64 {
        self.prefer[a][b] as i64 - self.prefer[b][a] as i64
    }

    /// True when a strict majority of those with an opinion prefer `a` to `b`.
    pub fn beats(&self, a: CandidateId, b: CandidateId) -> bool {
        self.prefer[a][b] > self.prefer[b][a]
    }

    /// The candidate who beats every other candidate head to head, if there is one.
    pub fn condorcet_winner(&self) -> Option<CandidateId> {
        let n = self.len();
        (0..n).find(|&a| (0..n).all(|b| a == b || self.beats(a, b)))
    }

    /// The candidate who loses to every other candidate head to head, if there is one.
    pub fn condorcet_loser(&self) -> Option<CandidateId> {
        let n = self.len();
        if n < 2 {
            return None;
        }
        (0..n).find(|&a| (0..n).all(|b| a == b || self.beats(b, a)))
    }

    /// The Smith set: the smallest group of candidates who each beat every
    /// candidate outside the group. It is the Condorcet winner alone when one
    /// exists, and a cycle otherwise.
    #[allow(clippy::needless_range_loop)]
    pub fn smith_set(&self) -> Vec<CandidateId> {
        let n = self.len();
        // reach[a][b]: a beats or ties b, directly or through a chain of such results.
        let mut reach: Vec<Vec<bool>> =
            (0..n).map(|a| (0..n).map(|b| a == b || self.margin(a, b) >= 0).collect()).collect();
        for k in 0..n {
            for i in 0..n {
                if reach[i][k] {
                    for j in 0..n {
                        if reach[k][j] {
                            reach[i][j] = true;
                        }
                    }
                }
            }
        }
        (0..n).filter(|&a| reach[a].iter().all(|&r| r)).collect()
    }

    /// A shortest majority cycle (`a` beats `b` beats ... beats `a`), if any exists.
    pub fn majority_cycle(&self) -> Option<Vec<CandidateId>> {
        let n = self.len();
        let mut best: Option<Vec<CandidateId>> = None;
        for start in 0..n {
            // Breadth-first search for the shortest way back to `start`.
            let mut parent: Vec<Option<CandidateId>> = vec![None; n];
            let mut seen = vec![false; n];
            let mut queue = VecDeque::new();
            seen[start] = true;
            queue.push_back(start);
            let mut closing = None;
            'search: while let Some(a) = queue.pop_front() {
                for b in 0..n {
                    if a != b && self.beats(a, b) {
                        if b == start {
                            closing = Some(a);
                            break 'search;
                        }
                        if !seen[b] {
                            seen[b] = true;
                            parent[b] = Some(a);
                            queue.push_back(b);
                        }
                    }
                }
            }
            if let Some(last) = closing {
                let mut cycle = vec![last];
                while let Some(p) = parent[*cycle.last().unwrap()] {
                    cycle.push(p);
                }
                cycle.reverse();
                if best.as_ref().is_none_or(|b| cycle.len() < b.len()) {
                    best = Some(cycle);
                }
            }
        }
        best
    }

    /// Everything above in one serialisable bundle.
    pub fn summary(&self) -> PairwiseSummary {
        PairwiseSummary {
            matrix: self.prefer.clone(),
            condorcet_winner: self.condorcet_winner(),
            condorcet_loser: self.condorcet_loser(),
            smith_set: self.smith_set(),
            cycle: self.majority_cycle(),
        }
    }
}

/// Head-to-head facts about an election.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PairwiseSummary {
    pub matrix: Vec<Vec<u64>>,
    pub condorcet_winner: Option<CandidateId>,
    pub condorcet_loser: Option<CandidateId>,
    pub smith_set: Vec<CandidateId>,
    pub cycle: Option<Vec<CandidateId>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_condorcet_winner_and_loser() {
        let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]);
        let pm = PairwiseMatrix::new(&e);
        assert_eq!(pm.prefer(1, 0), 60);
        assert_eq!(pm.condorcet_winner(), Some(1));
        assert_eq!(pm.condorcet_loser(), Some(0));
        assert_eq!(pm.smith_set(), vec![1]);
        assert_eq!(pm.majority_cycle(), None);
    }

    #[test]
    fn finds_cycles() {
        let e = Election::named(4).with(4, &[0, 1, 2, 3]).with(3, &[1, 2, 0, 3]).with(2, &[2, 0, 1, 3]);
        let pm = PairwiseMatrix::new(&e);
        assert_eq!(pm.condorcet_winner(), None);
        assert_eq!(pm.smith_set(), vec![0, 1, 2]);
        let cycle = pm.majority_cycle().unwrap();
        assert_eq!(cycle.len(), 3);
        for i in 0..3 {
            assert!(pm.beats(cycle[i], cycle[(i + 1) % 3]));
        }
    }
}
