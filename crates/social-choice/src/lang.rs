//! The languages the library writes its explanations in.
//!
//! Every function that produces text a person reads (round notes, method
//! descriptions, counterexamples…) has a variant taking a [`Lang`]. The plain
//! variants write English.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Lang {
    #[default]
    En,
    Fr,
}

impl Lang {
    pub const ALL: [Lang; 2] = [Lang::En, Lang::Fr];

    /// The language code: `en` or `fr`.
    pub fn code(self) -> &'static str {
        match self {
            Lang::En => "en",
            Lang::Fr => "fr",
        }
    }

    /// The English or the French version of something.
    pub fn pick<T>(self, en: T, fr: T) -> T {
        match self {
            Lang::En => en,
            Lang::Fr => fr,
        }
    }

    /// Applies the language's typography to text written with ordinary spaces.
    ///
    /// French takes a narrow no-break space before `;`, `!` and `?`, a no-break
    /// space before `:` and inside guillemets (« … »), so the punctuation never
    /// starts a line on its own. English text is returned unchanged.
    pub fn typeset(self, text: &str) -> String {
        if self == Lang::En || !text.contains([' ', '«']) {
            return text.to_string();
        }
        const NARROW: char = '\u{202f}';
        const NBSP: char = '\u{a0}';
        let mut out = String::with_capacity(text.len() + 8);
        let mut chars = text.chars().peekable();
        while let Some(c) = chars.next() {
            match (c, chars.peek()) {
                (' ', Some(';' | '!' | '?')) => out.push(NARROW),
                (' ', Some(':' | '»')) => out.push(NBSP),
                ('«', Some(' ')) => {
                    chars.next();
                    out.push('«');
                    out.push(NBSP);
                }
                _ => out.push(c),
            }
        }
        out
    }
}

impl fmt::Display for Lang {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code())
    }
}

/// Error for a language the library does not speak.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnknownLang(pub String);

impl fmt::Display for UnknownLang {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "unknown language `{}`", self.0)
    }
}

impl std::error::Error for UnknownLang {}

impl FromStr for Lang {
    type Err = UnknownLang;

    /// Reads `en`, `fr` or a regional tag such as `fr-FR` or `fr_CA`, in any case.
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let primary = s.split(['-', '_']).next().unwrap_or_default();
        Lang::ALL.into_iter().find(|l| l.code().eq_ignore_ascii_case(primary)).ok_or_else(|| UnknownLang(s.to_string()))
    }
}

/// `tr!(lang, "English {x}", "Français {x}", args…)`: `format!` in the
/// language asked for. Both strings take the same arguments.
macro_rules! tr {
    ($lang:expr, $en:literal, $fr:literal $(, $($arg:tt)*)?) => {
        match $lang {
            $crate::lang::Lang::En => format!($en $(, $($arg)*)?),
            $crate::lang::Lang::Fr => format!($fr $(, $($arg)*)?),
        }
    };
}
pub(crate) use tr;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_codes_and_regional_tags() {
        assert_eq!("en".parse::<Lang>().unwrap(), Lang::En);
        for tag in ["fr", "FR", "fr-FR", "fr_CA", "Fr-be"] {
            assert_eq!(tag.parse::<Lang>().unwrap(), Lang::Fr, "{tag}");
        }
        assert!("de".parse::<Lang>().is_err());
        assert!("".parse::<Lang>().is_err());
        assert_eq!(serde_json::to_string(&Lang::Fr).unwrap(), "\"fr\"");
    }

    #[test]
    fn french_typography() {
        assert_eq!(
            Lang::Fr.typeset("Qui gagne ? Ada : 3 ; Bea ! « Oui »"),
            "Qui gagne\u{202f}? Ada\u{a0}: 3\u{202f}; Bea\u{202f}! «\u{a0}Oui\u{a0}»"
        );
        // Only spaces typed before the punctuation change; URLs and ratios don't.
        assert_eq!(Lang::Fr.typeset("https://x.fr?a=1 16–14"), "https://x.fr?a=1 16–14");
        assert_eq!(Lang::En.typeset("Who wins ? « x »"), "Who wins ? « x »");
    }

    #[test]
    fn tr_formats_in_the_chosen_language() {
        let name = "Ada";
        assert_eq!(tr!(Lang::En, "{name} wins", "{name} gagne"), "Ada wins");
        assert_eq!(tr!(Lang::Fr, "{} wins {}", "{1} : {0}", name, 3), "3 : Ada");
    }
}
