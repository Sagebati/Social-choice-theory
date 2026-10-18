//! # social-choice
//!
//! Social choice theory, encoded: voting methods, head-to-head (Condorcet)
//! analysis, fairness criteria, strategic manipulation and Arrow's theorem.
//!
//! * [`election`]: candidates and ballots. A ballot carries a ranking, approvals
//!   and scores so every method can read the part it needs.
//! * [`methods`]: fifteen voting methods, from plurality to Schulze and STAR, each
//!   returning a winner, a social ranking and the count round by round.
//! * [`pairwise`]: Condorcet winners and losers, the Smith set and majority cycles.
//! * [`criteria`]: fairness criteria (majority, Condorcet, monotonicity,
//!   participation, independence of irrelevant alternatives, clones…), which
//!   methods pass them, and a search that produces counterexamples.
//! * [`manipulation`]: find voters who can win by lying, classify the tactic
//!   (compromising, burying, push-over…), detect spoilers and measure how often
//!   random elections can be manipulated (the Gibbard–Satterthwaite theorem).
//! * [`arrow`]: check a rule against every profile of a small electorate and
//!   watch Arrow's impossibility theorem happen.
//! * [`spatial`]: the opinion-map model, with crowds of voters, strategic voters
//!   and Yee diagrams.
//! * [`scenarios`] and [`catalog`]: famous paradoxes and plain-language
//!   descriptions of how every method can be gamed.
//!
//! ```
//! use social_choice::{Election, Method, PairwiseMatrix};
//! use social_choice::manipulation::find_spoilers;
//!
//! // 40 voters rank Ada > Bea > Cal, 35 rank Bea > Cal > Ada, 25 rank Cal > Bea > Ada.
//! let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]);
//!
//! assert_eq!(e.name(Method::Plurality.run(&e).winner), "Ada");
//! assert_eq!(e.name(Method::Irv.run(&e).winner), "Bea");
//!
//! // Bea beats both rivals head to head...
//! assert_eq!(PairwiseMatrix::new(&e).condorcet_winner(), Some(1));
//! // ...and Cal is spoiling the plurality election for Bea.
//! assert!(find_spoilers(&e, Method::Plurality).iter().any(|s| s.candidate == 2 && s.winner_without == 1));
//! ```

pub mod arrow;
pub mod catalog;
pub mod criteria;
pub mod election;
pub mod manipulation;
pub mod methods;
pub mod outcome;
pub mod pairwise;
pub mod random;
pub mod scenarios;
pub mod spatial;
pub mod text;

pub use criteria::Criterion;
pub use election::{Ballot, CandidateId, Election, Error};
pub use methods::{BallotKind, Method};
pub use outcome::{Outcome, Round};
pub use pairwise::PairwiseMatrix;
