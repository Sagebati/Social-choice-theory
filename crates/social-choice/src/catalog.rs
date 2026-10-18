//! Plain-language descriptions of every method: how it works, where it is used
//! and, above all, how it can be gamed. The French texts are in [`fr`] and
//! follow the English ones rig for rig.

use crate::criteria::{satisfies, Criterion};
use crate::lang::Lang;
use crate::methods::{BallotKind, Family, Method};
use serde::Serialize;

mod fr;

/// One way to rig or game a method.
#[derive(Debug, Clone, Serialize)]
pub struct Rig {
    pub title: &'static str,
    pub how: &'static str,
    /// A scenario (see [`crate::scenarios`]) where the trick can be tried.
    pub scenario: Option<&'static str>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Verdict {
    pub criterion: Criterion,
    pub satisfied: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct MethodInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub family: Family,
    pub ballot: BallotKind,
    pub summary: &'static str,
    pub how_it_works: &'static str,
    pub used_in: &'static str,
    pub rigging: Vec<Rig>,
    pub criteria: Vec<Verdict>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CriterionInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub question: &'static str,
    pub description: &'static str,
}

pub fn criteria() -> Vec<CriterionInfo> {
    criteria_in(Lang::En)
}

pub fn criteria_in(lang: Lang) -> Vec<CriterionInfo> {
    Criterion::ALL
        .into_iter()
        .map(|c| CriterionInfo {
            id: c.id(),
            name: c.name_in(lang),
            question: c.question_in(lang),
            description: c.description_in(lang),
        })
        .collect()
}

fn rig(title: &'static str, how: &'static str, scenario: Option<&'static str>) -> Rig {
    Rig { title, how, scenario }
}

/// A method's summary, how it works, where it is used and how to rig it.
type Texts = (&'static str, &'static str, &'static str, Vec<Rig>);

pub fn info(method: Method) -> MethodInfo {
    info_in(method, Lang::En)
}

pub fn info_in(method: Method, lang: Lang) -> MethodInfo {
    let (summary, how_it_works, used_in, rigging) = match lang {
        Lang::En => english(method),
        Lang::Fr => fr::texts(method),
    };
    MethodInfo {
        id: method.id(),
        name: method.name_in(lang),
        family: method.family(),
        ballot: method.ballot_kind(),
        summary,
        how_it_works,
        used_in,
        rigging,
        criteria: Criterion::ALL
            .into_iter()
            .map(|c| Verdict { criterion: c, satisfied: satisfies(method, c) })
            .collect(),
    }
}

pub fn all() -> Vec<MethodInfo> {
    all_in(Lang::En)
}

pub fn all_in(lang: Lang) -> Vec<MethodInfo> {
    Method::ALL.into_iter().map(|m| info_in(m, lang)).collect()
}

fn english(method: Method) -> Texts {
    match method {
        Method::Plurality => (
            "Mark one name. Most marks wins.",
            "Each voter picks a single candidate and the candidate with the most votes wins, even \
             without a majority. It ignores everything about a voter except their favourite.",
            "Legislative elections in the United Kingdom, United States, Canada and India.",
            vec![
                rig(
                    "Run a spoiler",
                    "Sponsor a candidate who looks like your opponent. They split your opponent's \
                     supporters, and you win with a minority.",
                    Some("spoiler"),
                ),
                rig(
                    "Lean on the lesser evil",
                    "Convince supporters of a third candidate that a vote for them is wasted. They \
                     compromise on whichever front-runner they mind less, so whoever controls the \
                     story of who is 'viable' (polls, media) shapes the race.",
                    Some("spoiler"),
                ),
                rig(
                    "Win while most voters rank you last",
                    "With the opposition divided, a candidate that a majority ranks dead last can still \
                     win: plurality can elect the Condorcet loser.",
                    Some("spoiler"),
                ),
                rig(
                    "Two-party lock-in (Duverger's law)",
                    "Because voting for a third choice tends to help your least favourite, support \
                     drains towards two big parties, and newcomers struggle to break in.",
                    None,
                ),
            ],
        ),
        Method::AntiPlurality => (
            "Veto one name. Fewest vetoes wins.",
            "Each voter vetoes the candidate they like least, and the candidate with the fewest \
             vetoes wins. A candidate nobody hates wins even if nobody loves them.",
            "Rare as a public election method; it shows up in small committees and party games.",
            vec![
                rig(
                    "Veto the threat, not the one you hate",
                    "Use your veto on the strongest rival of your favourite rather than on the \
                     candidate you truly like least (burying).",
                    None,
                ),
                rig(
                    "Hide in the crowd",
                    "A bland candidate gets few vetoes. Keep yours out of the spotlight and let \
                     everyone veto each other's champions.",
                    None,
                ),
            ],
        ),
        Method::TwoRound => (
            "Top two by first choices meet in a runoff.",
            "If someone wins a majority of first choices they win outright. Otherwise the two \
             candidates with the most first choices face each other, and the one preferred by more \
             voters wins. Here the runoff is counted from the same ranked ballots.",
            "Presidential elections in France, Brazil and many other countries (as two separate \
             rounds of voting).",
            vec![
                rig(
                    "Choose your opponent",
                    "Supporters of a strong candidate vote in round one for a weak candidate, so their \
                     favourite meets an easy opponent in the runoff (push-over). It can backfire.",
                    None,
                ),
                rig(
                    "Split them in round one",
                    "Spread a broadly acceptable candidate's supporters across look-alikes so they miss \
                     the runoff. In France in 2002 a fragmented left let the far-right candidate into \
                     the second round.",
                    None,
                ),
                rig(
                    "More votes, worse result",
                    "Gaining first-round votes can change who you face in the runoff and make you lose: \
                     the method is not monotonic.",
                    None,
                ),
            ],
        ),
        Method::Irv => (
            "Rank candidates. Eliminate the weakest, transfer, repeat.",
            "Voters rank the candidates. If nobody has a majority of first choices, the candidate with \
             the fewest is eliminated and their ballots move to each voter's next choice still in the \
             race. Repeat until someone has a majority.",
            "Australia's House of Representatives, Irish presidential elections, Maine, Alaska and \
             New York City primaries.",
            vec![
                rig(
                    "Squeeze the centre",
                    "A compromise candidate who would beat everyone head to head can be eliminated first \
                     because few people rank them first. Polarise the race and the moderate vanishes \
                     (Burlington, Vermont in 2009; Alaska's 2022 special House election).",
                    Some("center_squeeze"),
                ),
                rig(
                    "Push over",
                    "Rank a hopeless candidate first to change the elimination order and knock out a \
                     dangerous rival early. The flip side: ranking the winner higher can make them lose.",
                    Some("monotonicity"),
                ),
                rig(
                    "Stay home",
                    "Sometimes a group gets a result it likes better by not voting at all: the no-show \
                     paradox.",
                    Some("no_show"),
                ),
                rig(
                    "Betray your favourite",
                    "If your favourite is the one being squeezed, you may need to rank a front-runner \
                     first, the same lesser-evil logic as plurality.",
                    Some("center_squeeze"),
                ),
            ],
        ),
        Method::Coombs => (
            "Like instant runoff, but eliminate the most disliked.",
            "If nobody has a majority of first choices, eliminate the candidate ranked last by the \
             most voters, and repeat.",
            "Mostly a textbook method; some clubs and organisations use it.",
            vec![rig(
                "Bury the rival",
                "Elimination depends on last places, so a coordinated bloc that ranks a rival last can \
                 knock them out almost at will.",
                None,
            )],
        ),
        Method::Borda => (
            "Points by rank: the more voters rank you high, the more points.",
            "With n candidates, a first choice earns n−1 points, a second n−2, down to 0 for last. \
             Highest total wins. It rewards broadly liked candidates, even those few love.",
            "Seats for the Italian and Hungarian minorities in Slovenia, many sports awards and \
             song contests use points by rank.",
            vec![
                rig(
                    "Bury the rival",
                    "Rank your favourite's main rival dead last, below candidates you actually think are \
                     worse. If both camps do it, a weak 'dark horse' can win.",
                    Some("borda_burying"),
                ),
                rig(
                    "Run a team of clones",
                    "Field several similar candidates. They collect high points together and push every \
                     opponent down each ballot (teaming).",
                    Some("borda_teaming"),
                ),
                rig(
                    "Borda's own defence",
                    "When told his method was easy to manipulate, Borda reportedly answered: 'My scheme \
                     is only intended for honest men.'",
                    None,
                ),
            ],
        ),
        Method::Agenda => (
            "A chain of head-to-head votes in a fixed order.",
            "The first two candidates face off; the winner faces the third, and so on. The last one \
             standing wins. This is how many parliaments vote on amendments.",
            "Legislatures voting on amendments and motions.",
            vec![
                rig(
                    "Control the agenda",
                    "When the majority goes in circles, whoever enters the agenda last wins. The chair \
                     picks the winner by picking the order.",
                    Some("condorcet_paradox"),
                ),
                rig(
                    "Elect someone everybody ranks lower",
                    "With four candidates a clever agenda can elect a candidate that every single voter \
                     ranks below another one: it fails unanimity.",
                    None,
                ),
            ],
        ),
        Method::Copeland => (
            "Most head-to-head wins.",
            "Every pair of candidates is compared. A candidate gets a point for each rival a majority \
             prefers them to (half a point for a tie). Most points wins.",
            "Round-robin sports tournaments and some private organisations.",
            vec![
                rig(
                    "Manufacture a cycle",
                    "Bury the Condorcet winner to create a cycle. Copeland scores then tie, and the \
                     tie-break decides.",
                    Some("condorcet_burying"),
                ),
                rig(
                    "Field clones",
                    "Each clone adds a head-to-head result, so a family of look-alikes can shift the \
                     counts.",
                    None,
                ),
            ],
        ),
        Method::Minimax => (
            "Smallest worst defeat wins.",
            "Every candidate is judged by their heaviest head-to-head defeat. The candidate whose worst \
             defeat is mildest wins, so a Condorcet winner (no defeats) always wins.",
            "Mainly studied in theory; easy to count by hand.",
            vec![
                rig(
                    "Bury the Condorcet winner",
                    "Insincerely ranking the Condorcet winner low gives them an artificial defeat, which \
                     may be all your candidate needs.",
                    Some("condorcet_burying"),
                ),
                rig(
                    "Elect the Condorcet loser",
                    "With four candidates the candidate who loses to everyone can win if the others all \
                     have one heavy defeat.",
                    None,
                ),
            ],
        ),
        Method::Schulze => (
            "Strongest chain of head-to-head wins.",
            "Candidate X beats Y if X has a stronger chain of head-to-head wins leading to Y than Y has \
             to X, where a chain is as strong as its weakest link. Somebody always beats everyone this \
             way, and they win.",
            "Debian, Gentoo, Ubuntu and many Pirate Parties.",
            vec![
                rig(
                    "Bury the Condorcet winner",
                    "Ranking the Condorcet winner insincerely low can create a cycle that your candidate \
                     wins. It is risky: if too many bury, a third candidate can win.",
                    Some("condorcet_burying"),
                ),
                rig(
                    "Stay home",
                    "With four or more candidates every Condorcet method suffers from the no-show \
                     paradox (Moulin, 1988).",
                    None,
                ),
            ],
        ),
        Method::RankedPairs => (
            "Lock in the strongest majorities first.",
            "Sort the head-to-head results from the biggest majority to the smallest. Lock each one in \
             unless it would contradict the ones already locked (create a cycle). The candidate on top \
             of the locked order wins.",
            "Some private organisations and student unions.",
            vec![
                rig(
                    "Bury the Condorcet winner",
                    "As with every Condorcet method, a bloc can try to manufacture a cycle. Finding a \
                     working manipulation is NP-hard in general, a small comfort.",
                    Some("condorcet_burying"),
                ),
                rig(
                    "Stay home",
                    "With four or more candidates, abstaining can help you (Moulin's no-show paradox).",
                    None,
                ),
            ],
        ),
        Method::Approval => (
            "Approve as many as you like. Most approvals wins.",
            "Each voter approves any number of candidates; the candidate approved by the most voters \
             wins. Supporting a second choice never hurts your first choice's count.",
            "City elections in Fargo, North Dakota and St. Louis, Missouri, and many scientific \
             societies.",
            vec![
                rig(
                    "Bullet vote",
                    "Approve only your favourite so you never help a close rival. If both rival camps \
                     think this way, the broadly liked candidate can lose (the 'Burr dilemma').",
                    None,
                ),
                rig(
                    "Draw the line at the front-runner",
                    "Strategic voters approve their preferred front-runner and everyone they like more, \
                     and nobody else. Whoever shapes the polls shapes where everyone draws the line.",
                    None,
                ),
                rig(
                    "Beat the majority's favourite",
                    "A candidate preferred by a majority can lose if that majority also approves \
                     somebody else.",
                    None,
                ),
            ],
        ),
        Method::Score => (
            "Score every candidate. Highest total wins.",
            "Voters give each candidate a score, here from 0 to 5, like rating a restaurant. The \
             highest total (or average) wins.",
            "Rarely used for public office; everywhere in ratings, reviews and judging.",
            vec![
                rig(
                    "Exaggerate",
                    "Give your preferred front-runner the top score and everyone else zero. Honest voters \
                     who use the whole scale are outweighed by those who only use the ends.",
                    None,
                ),
                rig(
                    "Turn it into approval",
                    "Once everyone exaggerates, score voting behaves exactly like approval voting.",
                    None,
                ),
            ],
        ),
        Method::Star => (
            "Score, then an automatic runoff between the top two.",
            "Voters score every candidate. The two with the highest totals go to a runoff, where each \
             ballot counts as one vote for whichever finalist it scored higher.",
            "Primaries of the Independent Party of Oregon.",
            vec![
                rig(
                    "Exaggerate, but not completely",
                    "Exaggerating helps in the scoring round, but giving two finalists the same score \
                     means sitting out the runoff, which limits the payoff.",
                    None,
                ),
                rig(
                    "Run a twin",
                    "Two similar candidates can both reach the runoff and crowd out a broadly liked \
                     third, so it is not independent of clones.",
                    None,
                ),
                rig(
                    "Coarse scores, odd winners",
                    "When voters give equal scores to candidates they do not like equally, the runoff \
                     can even elect the candidate who loses every head-to-head contest.",
                    None,
                ),
            ],
        ),
        Method::Dictatorship => (
            "Voter number one decides.",
            "The first ballot is the result. Every other ballot is ignored.",
            "Thankfully, only thought experiments (and some boardrooms).",
            vec![rig(
                "Capture the dictator",
                "Nobody but the dictator can manipulate it with their own ballot, which is why it \
                 escapes the Gibbard–Satterthwaite theorem. To rig it, become the dictator or get \
                 their ear.",
                None,
            )],
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scenarios;

    fn translated(en: &str, fr: &str, what: &str) {
        assert!(!fr.trim().is_empty() && fr != en, "{what} is not translated: {fr}");
    }

    #[test]
    fn french_catalogue_follows_the_english() {
        for m in Method::ALL {
            let (en, fr) = (info_in(m, Lang::En), info_in(m, Lang::Fr));
            assert!(!fr.name.is_empty());
            translated(en.summary, fr.summary, m.id());
            translated(en.how_it_works, fr.how_it_works, m.id());
            translated(en.used_in, fr.used_in, m.id());
            assert_eq!(en.rigging.len(), fr.rigging.len(), "{}: one rig per rig", m.id());
            for (a, b) in en.rigging.iter().zip(&fr.rigging) {
                assert_eq!(a.scenario, b.scenario, "{}: {}", m.id(), b.title);
                translated(a.title, b.title, m.id());
                translated(a.how, b.how, m.id());
            }
        }
        for (en, fr) in criteria_in(Lang::En).iter().zip(&criteria_in(Lang::Fr)) {
            assert!(!fr.name.is_empty());
            translated(en.question, fr.question, en.id);
            translated(en.description, fr.description, en.id);
        }
        for (en, fr) in scenarios::all_in(Lang::En).iter().zip(&scenarios::all_in(Lang::Fr)) {
            assert_eq!(en.id, fr.id);
            assert_eq!(en.election, fr.election);
            translated(en.title, fr.title, en.id);
            translated(en.story, fr.story, en.id);
        }
    }
}
