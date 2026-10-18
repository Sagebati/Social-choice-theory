//! Small helpers for the plain-language explanations attached to results.

use crate::election::{Ballot, CandidateId, Election};
use crate::lang::{tr, Lang};
use crate::methods::BallotKind;

/// A ballot as its voter would read it, showing only what `kind` of method reads.
/// It reads after a verb: "vote for Ada", « voter pour Ada ».
pub fn describe_ballot(e: &Election, b: &Ballot, kind: BallotKind) -> String {
    describe_ballot_in(e, b, kind, Lang::En)
}

pub fn describe_ballot_in(e: &Election, b: &Ballot, kind: BallotKind, lang: Lang) -> String {
    match kind {
        BallotKind::ChooseOne => tr!(lang, "for {}", "pour {}", e.name(b.ranking[0])),
        BallotKind::Veto => tr!(lang, "against {}", "contre {}", e.name(b.ranking[b.ranking.len() - 1])),
        BallotKind::Ranked => e.describe_ranking(&b.ranking),
        BallotKind::Approval => {
            let approved: Vec<CandidateId> = b.ranking.iter().copied().filter(|&c| b.approvals[c]).collect();
            if approved.is_empty() {
                lang.pick("approving nobody", "sans approuver personne").to_string()
            } else {
                tr!(lang, "approving {}", "en approuvant {}", join_in(e, &approved, lang))
            }
        }
        BallotKind::Score => {
            b.ranking.iter().map(|&c| format!("{} {}", e.name(c), b.scores[c])).collect::<Vec<_>>().join(" · ")
        }
    }
}

/// `Ada`, `Ada and Bea`, `Ada, Bea and Cal`.
pub fn join(e: &Election, cs: &[CandidateId]) -> String {
    join_in(e, cs, Lang::En)
}

/// [`join`] in `lang`: `Ada, Bea et Cal` in French.
pub fn join_in(e: &Election, cs: &[CandidateId], lang: Lang) -> String {
    match cs {
        [] => String::new(),
        [only] => e.name(*only).to_string(),
        [rest @ .., last] => {
            let rest = rest.iter().map(|&c| e.name(c)).collect::<Vec<_>>().join(", ");
            tr!(lang, "{rest} and {}", "{rest} et {}", e.name(*last))
        }
    }
}

/// `1 voter`, `3 voters`.
pub fn voters(n: u64) -> String {
    voters_in(n, Lang::En)
}

/// [`voters`] in `lang`. In French 0 and 1 take the singular: `1 électeur`,
/// `3 électeurs`.
pub fn voters_in(n: u64, lang: Lang) -> String {
    match lang {
        Lang::En if n == 1 => "1 voter".to_string(),
        Lang::En => format!("{n} voters"),
        Lang::Fr if n < 2 => format!("{n} électeur"),
        Lang::Fr => format!("{n} électeurs"),
    }
}

/// French elides « de » and « que » before a vowel: `d’Ada`, `de Bea`.
fn elides(name: &str) -> bool {
    name.chars().next().is_some_and(|c| c.to_lowercase().any(|c| "aàâäeéèêëiîïoôöuùûüyæœ".contains(c)))
}

/// « de » followed by `name`: `d’Ada`, `de Bea`.
pub fn fr_de(name: &str) -> String {
    if elides(name) {
        format!("d’{name}")
    } else {
        format!("de {name}")
    }
}

/// « que » followed by `name`: `qu’Ada`, `que Bea`.
pub fn fr_que(name: &str) -> String {
    if elides(name) {
        format!("qu’{name}")
    } else {
        format!("que {name}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn french_plurals_and_lists() {
        assert_eq!(voters_in(0, Lang::Fr), "0 électeur");
        assert_eq!(voters_in(1, Lang::Fr), "1 électeur");
        assert_eq!(voters_in(3, Lang::Fr), "3 électeurs");
        assert_eq!(voters(1), "1 voter");
        let e = Election::named(3);
        assert_eq!(join_in(&e, &[0, 1, 2], Lang::Fr), "Ada, Bea et Cal");
        assert_eq!(join(&e, &[0, 1]), "Ada and Bea");
        assert_eq!((fr_de("Ada"), fr_de("Bea"), fr_de("Élise")), ("d’Ada".into(), "de Bea".into(), "d’Élise".into()));
        assert_eq!((fr_que("Erik"), fr_que("Hal")), ("qu’Erik".to_string(), "que Hal".to_string()));
    }

    #[test]
    fn ballots_read_after_a_verb() {
        let e = Election::named(3).with(1, &[1, 0, 2]).complete().unwrap();
        let b = &e.ballots[0];
        assert_eq!(describe_ballot_in(&e, b, BallotKind::ChooseOne, Lang::Fr), "pour Bea");
        assert_eq!(describe_ballot_in(&e, b, BallotKind::Veto, Lang::Fr), "contre Cal");
        assert_eq!(describe_ballot_in(&e, b, BallotKind::Approval, Lang::Fr), "en approuvant Bea");
        assert_eq!(describe_ballot(&e, b, BallotKind::Ranked), "Bea > Ada > Cal");
    }
}
