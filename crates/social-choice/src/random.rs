//! Deterministic randomness for simulations: a tiny PRNG and election generators.

use crate::election::{Ballot, Election, DEFAULT_MAX_SCORE, MAX_CANDIDATES};

/// SplitMix64: small, fast and reproducible. Not for cryptography.
#[derive(Debug, Clone)]
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Self {
        Rng(seed)
    }

    pub fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    /// Uniform in `0..n`. `n` must be positive.
    pub fn below(&mut self, n: u64) -> u64 {
        self.next_u64() % n
    }

    /// Uniform in `lo..=hi`.
    pub fn range(&mut self, lo: u64, hi: u64) -> u64 {
        lo + self.below(hi - lo + 1)
    }

    /// Uniform in `[0, 1)`.
    pub fn unit(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }

    pub fn shuffle<T>(&mut self, items: &mut [T]) {
        for i in (1..items.len()).rev() {
            let j = self.below(i as u64 + 1) as usize;
            items.swap(i, j);
        }
    }
}

/// A random election with `groups` blocs of like-minded voters.
///
/// Half the time each bloc's utilities are independent and uniform ("impartial
/// culture"); the other half, candidates and blocs are dropped on a square and
/// utility falls with distance ("spatial"), which produces the more structured
/// elections seen in practice. Ballots are honest: see [`Ballot::from_utilities`].
pub fn random_election(rng: &mut Rng, candidates: usize, groups: usize, max_weight: u32) -> Election {
    let candidates = candidates.clamp(1, MAX_CANDIDATES);
    let mut election = Election::named(candidates);
    let spatial = rng.unit() < 0.5;
    let positions: Vec<(f64, f64)> = (0..candidates).map(|_| (rng.unit(), rng.unit())).collect();
    for _ in 0..groups {
        let utilities: Vec<f64> = if spatial {
            let (x, y) = (rng.unit(), rng.unit());
            positions.iter().map(|&(cx, cy)| -((cx - x).powi(2) + (cy - y).powi(2)).sqrt()).collect()
        } else {
            (0..candidates).map(|_| rng.unit()).collect()
        };
        let weight = rng.range(1, u64::from(max_weight.max(1))) as u32;
        election.push(Ballot::from_utilities(&utilities, DEFAULT_MAX_SCORE, None).weighted(weight));
    }
    election
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_and_in_range() {
        let mut a = Rng::new(7);
        let mut b = Rng::new(7);
        for _ in 0..100 {
            let x = a.range(3, 9);
            assert_eq!(x, b.range(3, 9));
            assert!((3..=9).contains(&x));
            let u = a.unit();
            b.unit();
            assert!((0.0..1.0).contains(&u));
        }
    }

    #[test]
    fn random_elections_are_complete() {
        let mut rng = Rng::new(1);
        for _ in 0..50 {
            let e = random_election(&mut rng, 4, 5, 9);
            assert_eq!(e.ballots.len(), 5);
            assert!(e.clone().complete().is_ok());
        }
    }
}
