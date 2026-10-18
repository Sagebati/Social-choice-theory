//! Small helpers for the plain-English explanations attached to results.

use crate::election::{Ballot, CandidateId, Election};
use crate::methods::BallotKind;

/// A ballot as its voter would read it, showing only what `kind` of method reads.
pub fn describe_ballot(e: &Election, b: &Ballot, kind: BallotKind) -> String {
    match kind {
        BallotKind::ChooseOne => format!("for {}", e.name(b.ranking[0])),
        BallotKind::Veto => format!("against {}", e.name(b.ranking[b.ranking.len() - 1])),
        BallotKind::Ranked => e.describe_ranking(&b.ranking),
        BallotKind::Approval => {
            let approved: Vec<CandidateId> = b.ranking.iter().copied().filter(|&c| b.approvals[c]).collect();
            if approved.is_empty() {
                "approving nobody".to_string()
            } else {
                format!("approving {}", join(e, &approved))
            }
        }
        BallotKind::Score => {
            b.ranking.iter().map(|&c| format!("{} {}", e.name(c), b.scores[c])).collect::<Vec<_>>().join(" · ")
        }
    }
}

/// `Ada`, `Ada and Bea`, `Ada, Bea and Cal`.
pub fn join(e: &Election, cs: &[CandidateId]) -> String {
    match cs {
        [] => String::new(),
        [only] => e.name(*only).to_string(),
        [rest @ .., last] => {
            format!("{} and {}", rest.iter().map(|&c| e.name(c)).collect::<Vec<_>>().join(", "), e.name(*last))
        }
    }
}

/// `1 voter`, `3 voters`.
pub fn voters(n: u64) -> String {
    if n == 1 {
        "1 voter".to_string()
    } else {
        format!("{n} voters")
    }
}
