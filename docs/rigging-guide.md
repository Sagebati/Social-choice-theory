# How to rig an election

*The written companion to the explorable ([version française](rigging-guide.fr.md)).
Every example below is one of the library's scenarios
(`crates/social-choice/src/scenarios.rs`), and its tests check each claim.*

You don't need to stuff ballot boxes. Every voting method has blind spots, and
anyone who understands them can turn them into an advantage. There are four
levers:

1. **The counting rule**: which method is used.
2. **The menu**: who is on the ballot (spoilers, clones).
3. **The ballots**: how voters fill them in (strategic voting).
4. **The order**: the sequence in which decisions are taken (agenda control).

This guide is about what the voting method itself allows. Gerrymandering,
turnout and misinformation are another story.

## Three ideas you need

### The Condorcet winner

Compare candidates two at a time. If one candidate beats every rival in these
one-on-one majority votes, they are the **Condorcet winner**, after the Marquis
de Condorcet, who proposed the test in 1785. Whoever else you elect, a majority
of voters would have preferred the Condorcet winner to them.

| | Ada | Bea | Cal |
| --- | --- | --- | --- |
| 40 voters | 1st | 2nd | 3rd |
| 35 voters | 3rd | 1st | 2nd |
| 25 voters | 3rd | 2nd | 1st |

Here Bea beats Ada 60–40 and Cal 75–25: Bea is the Condorcet winner. Yet
plurality elects Ada, with 40 first choices. Methods that always elect the
Condorcet winner when there is one are called **Condorcet methods** (Copeland,
minimax, Schulze, ranked pairs, sequential agendas). Plurality, two-round
runoff, instant runoff, Borda, approval, score and STAR can all miss them.

There may be no Condorcet winner at all. With 4 voters ranking
Ada > Bea > Cal, 3 ranking Bea > Cal > Ada and 2 ranking Cal > Ada > Bea, a
majority prefers Ada to Bea (6–3), Bea to Cal (7–2) and Cal to Ada (5–4).
This is the **Condorcet paradox**: individually sensible voters, collectively
going round in circles. Every method has to break such cycles somehow, and
that is where agenda-setters and buriers do their work.

### Arrow's impossibility theorem

Kenneth Arrow (1951) asked for a rule that turns any set of voter rankings into
a ranking for society and satisfies four modest conditions:

1. **Always a ranking**: for any ballots, the result is complete and transitive.
2. **Unanimity (Pareto)**: if every voter prefers X to Y, society does too.
3. **Independence of irrelevant alternatives**: society's ranking of X against
   Y depends only on how voters rank X against Y. Adding or removing a third
   candidate can't flip it, so no spoilers.
4. **No dictator**: no single voter whose strict preferences society always copies.

With three or more candidates, **no rule satisfies all four**. Pairwise majority
satisfies 2–4 but fails 1 (the Condorcet paradox). Dictatorship satisfies 1–3.
Every real method fails unanimity or independence. The theorem lab checks this
by brute force: with 3 candidates and 3 voters there are only 6³ = 216
profiles, and `arrow::check_arrow` simply tries them all.

Approval and score voting step outside the theorem by asking for more than a
ranking, but that does not protect them from strategy.

### The Gibbard–Satterthwaite theorem

Allan Gibbard (1973) and Mark Satterthwaite (1975) proved that with three or
more candidates, every method that can elect any candidate and is not a
dictatorship sometimes rewards a voter for lying. Gibbard's version covers any
kind of ballot. Rigging can't be designed away, only made rarer, riskier or
harder to compute. `manipulation::manipulability` measures how often random
elections can be manipulated under each method.

## The tactics

| Tactic | What the liar does | Where it bites |
| --- | --- | --- |
| **Compromising** | Ranks a lesser evil above their real favourite | Plurality, runoffs; the engine of two-party politics |
| **Burying** | Ranks a strong rival below candidates they actually think are worse | Borda, Coombs, and the only way to attack Condorcet methods |
| **Push-over** | Boosts a candidate they don't want, to change who their favourite faces or who gets eliminated | Non-monotonic methods: two-round, instant runoff, Coombs |
| **Bullet voting** | Supports only their favourite | Approval, score |
| **Exaggeration** | Uses only the top and bottom of a score scale | Score, STAR |
| **Spoilers and clones** | Changes the menu: a look-alike splits a rival's vote, or a team of clones collects extra points | Plurality (splitting), Borda (teaming), STAR |
| **Agenda control** | Picks the order of head-to-head votes | Sequential (agenda) voting whenever there is a cycle |
| **Abstaining** | Stays home because voting would elect someone worse | Methods failing participation: runoffs, Condorcet methods with 4+ candidates, STAR |

## Method by method

### Plurality (first past the post)

*Mark one name; most marks wins.* Used for legislative elections in the UK, US,
Canada and India.

* **Run a spoiler.** In the table above, Ada wins only because Bea and Cal split
  the other 60%. Withdraw Cal and Bea wins. Sponsor a look-alike of your rival
  and you can win with a minority. In Florida in 2000, Bush's margin was 537
  votes while Nader, whose voters mostly preferred Gore, won over 97,000.
* **Lean on the lesser evil.** If 6 of Cal's 25 voters switch to Bea, Bea wins
  41–40. Whoever shapes perceptions of who is "viable" shapes the race.
* **Win while most voters rank you last.** Plurality can elect the Condorcet
  loser.
* **Duverger's law.** Because a third-party vote can help your least favourite,
  support drains towards two big parties.

Passes majority, Pareto, monotonicity and participation. Fails Condorcet,
Condorcet loser, IIA and clones.

### Two-round runoff

*Top two by first choices go to a runoff.* Used for presidential elections in
France, Brazil and elsewhere.

* **Choose your opponent (push-over).** Supporters of a strong candidate vote
  for a weak one in round one to face an easy runoff.
* **Split them in round one.** A fragmented field keeps broadly acceptable
  candidates out of the runoff, as in France in 2002.
* **More votes, worse result.** Gaining first-round votes can change the runoff
  opponent and make you lose. The method is not monotonic.

### Instant-runoff voting (ranked-choice voting)

*Eliminate the candidate with the fewest first choices, transfer their ballots,
repeat.* Used for Australia's House of Representatives, Irish presidential
elections, Maine, Alaska and New York City primaries.

* **Centre squeeze.** With 35 Ada > Bea > Cal, 33 Cal > Bea > Ada and
  32 Bea > Ada > Cal, Bea beats Ada 65–35 and Cal 67–33 head to head, but has
  the fewest first choices and is eliminated first. Ada wins. This happened in
  Burlington, Vermont (2009) and in Alaska's 2022 special House election.
* **Winning by losing.** With 39 Ada > Bea > Cal, 35 Bea > Cal > Ada and
  26 Cal > Ada > Bea, Ada wins. If 10 Bea voters switch to ranking Ada first,
  Bea is eliminated instead and Cal wins 51–49. Seen from the side of those 10
  voters, this is push-over: by ranking Ada (their last choice) first, they
  replaced Ada with Cal (their second).
* **Better off staying home.** With 20 Bea > Ada > Cal, 40 Cal > Ada > Bea and
  30 Ada > Cal > Bea, Ada wins. If 15 more Bea > Ada > Cal voters turn up, Ada is
  eliminated and Cal wins, although the newcomers preferred Ada to Cal.

Passes majority, Condorcet loser and clones. Fails Condorcet, monotonicity,
participation and IIA.

### Coombs

*Eliminate the candidate ranked last by the most voters.* **Burying** is
devastating: a bloc that ranks a rival last can knock them out almost at will.

### Borda count

*n−1 points for a first choice down to 0 for the last.* Used for minority seats
in Slovenia, sports awards and song contests.

* **Bury the rival.** Honest 50 Ada > Bea > Cal and 40 Bea > Ada > Cal give Ada
  140 points to Bea's 130. If 11 Bea voters move Ada to last, below hopeless Cal,
  Bea wins. If both camps bury, a weak "dark horse" can win.
* **Run a team of clones.** Ada beats Bea 30–20 head to head. Add Bex, a
  near-copy of Bea that everyone ranks right next to Bea, and Bea wins the Borda count
  70 to 60.
* Borda reportedly answered critics: "My scheme is only intended for honest men."

Passes Condorcet loser, monotonicity and participation. Fails majority,
Condorcet, IIA and clones.

### Agenda (sequential pairwise voting)

*A chain of duels in a fixed order; the last one standing wins.* This is how
many legislatures vote on amendments.

* **Control the agenda.** In a cycle, whoever enters last wins, so the chair
  picks the winner by picking the order.
* **Elect someone everybody ranks lower.** With four candidates, an agenda can
  elect a candidate whom every voter ranks below another: it fails unanimity.

### Copeland, minimax, Schulze and ranked pairs

These Condorcet methods agree whenever there is a Condorcet winner and differ in
how they break cycles. Copeland counts wins (cycles become ties), minimax elects
whoever's worst defeat is mildest, Schulze follows the strongest chains of wins,
and ranked pairs locks in the biggest majorities first and drops the weakest
link of a cycle. Schulze is used by Debian, Gentoo, Ubuntu and many Pirate
Parties.

* **Bury the Condorcet winner to fake a cycle.** With 10 Ada > Bea > Cal,
  10 Cal > Ada > Bea and 15 Bea > Ada > Cal, Ada is the Condorcet winner. If 11
  of Bea's voters rank Ada last, Cal beats Ada 21–14, the cycle's weakest link
  becomes Ada's 20–15 win over Bea, and Schulze, ranked pairs and minimax all
  elect Bea. With 8 to 10 buriers there is already a cycle, but Ada survives it.
  Burying is a gamble: get the numbers wrong, or get found out, and it backfires.
* **Stay home.** With four or more candidates every Condorcet method suffers from
  the no-show paradox (Moulin, 1988).
* Minimax can even elect the Condorcet loser with four candidates, and is not
  independent of clones once a family of three clones beats itself in a cycle.

### Approval

*Approve any number of candidates; most approvals wins.* Used in Fargo, North
Dakota and St. Louis, Missouri.

* **Bullet vote.** Approve only your favourite so you never help a close rival.
  If both rival camps do it, the broadly liked candidate can lose.
* **Draw the line at the front-runner.** Strategic voters approve their preferred
  front-runner and everyone they like more, and nobody else, so whoever shapes
  the polls shapes where everyone draws the line.
* **Beat the majority's favourite.** A candidate preferred by a majority can
  lose if that majority also approves someone else.

### Score and STAR

*Score: grade each candidate 0–5, highest total wins. STAR: the two highest
totals go to an automatic runoff, where each ballot counts for whichever
finalist it scored higher.*

* **Exaggerate.** Give your preferred front-runner 5 and everyone else 0. Honest
  voters who use the whole scale are outweighed; once everyone exaggerates,
  score voting is approval voting.
* **STAR limits the reward.** Giving two finalists the same score means sitting
  out the runoff.
* **STAR teaming.** Two similar candidates can both reach the runoff and crowd
  out a broadly liked third.
* **Coarse scores.** When voters give equal scores to candidates they don't like
  equally, STAR's runoff can even elect the candidate who loses every
  head-to-head contest.

### Dictatorship

*The first ballot decides.* Nobody but the dictator can manipulate it with their
own ballot, which is exactly why it escapes Gibbard–Satterthwaite. To rig it,
become the dictator.

## Which method passes which criterion

✓ always satisfied, ✗ can fail (the theorem lab shows a counterexample for every ✗).

| Method | Majority | Condorcet winner | Condorcet loser | Unanimity | Monotonic | Participation | IIA | Clones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plurality | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Anti-plurality | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Two-round runoff | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Instant runoff | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Coombs | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Borda | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Agenda | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Copeland | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Minimax | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Schulze | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Ranked pairs | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Approval | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Score | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| STAR | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Dictatorship | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |

Criteria are judged against voters' full rankings, with honest approval and
score ballots derived from them. Approval and score "pass" IIA and clones
because, with ballots held fixed, removing or adding a candidate does not change
anyone else's approvals or scores.
