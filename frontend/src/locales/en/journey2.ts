// Steps 10 to 18 of the journey (src/journey/slides/T10–T18).

export default {
  t10: {
    intro:
      'When told his method was easy to manipulate, Borda is said to have replied: <em>"My scheme is only intended for honest men."</em> Two tricks show why he worried.',
    tabBury: 'Trick 1: burying',
    tabTeam: 'Trick 2: teaming',
    bury: "Under Borda, the order of your <em>lower</em> preferences scores points too. So a group can push a rival down to the bottom of its ballot, below candidates it actually likes less. That's <strong>burying</strong>.",
    buryChallenge:
      'Change the ranking of <strong>one</strong> group (use the ↑ buttons) so that Riverton gets a mayor that group prefers to Camille. Stuck? Ask the machine below.',
    burySuccess:
      "Margaret's 3 voters only had to drop Camille from fourth place to last: Camille loses 3 points, and Bruno wins. Nobody changed their mind about Bruno.",
    team: "Bruno's party has another idea: nominate <strong>{clone}</strong>, Bruno's running mate. Gina stands for exactly what Bruno stands for, so every voter ranks Gina right after Bruno.",
    enter: 'Gina enters the race',
    teamChallenge: 'Enter Gina and look at who wins the Borda count.',
    teamSuccess:
      'Gina wins nothing. But on every ballot Gina sits between Bruno and everyone ranked below Bruno, so Bruno gains a point over each of them, 30 points in all, and becomes mayor. Instant runoff, which only counts first choices, still elects {irv}.',
    lesson:
      "Borda is the method most exposed to strategy: burying a rival, or running look-alike candidates (<strong>teaming</strong>), both buy points without changing a single voter's opinion.",
    live: 'Borda points, live',
  },

  t11: {
    intro:
      'In 1785 the Marquis de Condorcet proposed the most natural test of all: pit the candidates against each other <strong>two at a time</strong>. Who would a majority choose, Amira or Bruno? Bruno or Camille? There are ten such duels.',
    winner:
      'A candidate who wins <strong>every</strong> duel is the <strong>Condorcet winner</strong>. Whoever else you pick, a majority would have preferred the Condorcet winner. Methods that always elect them (Schulze, ranked pairs, Copeland, minimax) are called Condorcet methods.',
    question: 'Who wins every duel?',
    challenge:
      'Pick two candidates under the diagram, or use the shortcuts, to see which groups side with whom. Inspect three duels.',
    success:
      'Bruno beats everyone: Amira 18–12, Camille 19–11, Daniel 19–11, Erik 16–14. Fifth system, fifth mayor. And Erik, whom plurality elected, loses every single duel.',
    lesson:
      'Same voters, five systems, five different mayors: Erik, Amira, Daniel, Camille, Bruno. Each system is "fair" by some definition, and each one asks a different question of the very same ballots.',
    duel: 'Duel',
    first: 'First candidate',
    second: 'Second candidate',
    versus: 'vs',
    showTable: 'Show all ten duels as a table',
    hideTable: 'Hide all ten duels as a table',
    quick: '{a} vs {b}',
    waiting: 'Make a prediction to hold the duels.',
  },

  t12: {
    paradox:
      'Condorcet spotted a catch in his own idea. Sometimes nobody wins every duel: A beats B, B beats C and C beats A, like rock, paper, scissors. This is the <strong>Condorcet paradox</strong>. Every Condorcet method needs a rule for breaking such cycles, usually by ignoring the weakest link.',
    manufacture:
      "Riverton has no cycle: Bruno is a clear Condorcet winner. But Ana's group, who want Camille, could <em>manufacture</em> one, by ranking Bruno lower than they really feel. That's <strong>burying</strong> again.",
    challenge: "Change only Ana's ballot (the ↑ buttons) so that Camille becomes mayor under the Condorcet methods.",
    success:
      "Pushed below Amira or Erik on Ana's ballot, Bruno now loses that duel, so nobody beats everyone any more. The duels go round in a circle, and when the Condorcet methods break it at its weakest link, Camille comes out on top. Ana's six voters elected Camille without anyone changing their mind.",
    lesson:
      "Condorcet methods can only be manipulated by creating a cycle, which needs good information about everyone else's ballots, and it can backfire: if Bruno's supporters bury Camille in return, everybody loses. That makes them hard, but not impossible, to rig.",
  },

  t13: {
    intro:
      'Rankings are a lot to ask. <strong>Approval voting</strong> asks for less: tick every candidate you would be happy with. Most ticks wins. Fargo, North Dakota and St. Louis, Missouri elect their city officials this way.',
    topTwo: 'Each group here ticks its top two.',
    question: 'Who gets the most ticks?',
    dilemma:
      'Bruno, again: for the first time two systems agree. Approval and the head-to-head count both pick the candidate nobody hates. Now the dilemma: should a group tick its second choice at all? A tick for your second choice might help them beat your first.',
    challenge:
      'Make a group <strong>bullet vote</strong>: untick everything on its ballot except its favourite. Find a group for whom that backfires.',
    success:
      'Without the ticks for Bruno, Daniel wins, and Frank and Leo both rank Daniel fourth. The safe-looking bullet vote handed them a worse mayor.',
    askMachine: 'Can any group rig approval voting here? Ask the machine:',
    lesson:
      'Approval has no spoilers: ticking one more name never takes a tick from anyone else. Its strategy problem is where to draw the line. In Riverton nobody can gain by moving it, but in a closer race the groups backing two similar candidates face a game of chicken: whoever stops ticking the other first may win, or lose both.',
    ticks: 'Ticks',
    unit: 'ticks',
    waiting: 'Make a prediction to count the ticks.',
  },

  t14: {
    score:
      "<strong>Score voting</strong> asks how much: give each candidate 0 to 5 stars, like rating a restaurant. Highest total wins. Each group gives its favourite 5 stars, then 4, 3, 1 and 0. Camille collects the most stars, 101 to Bruno's 97, matching the Borda count.",
    star: '<strong>STAR voting</strong> (Score Then Automatic Runoff) adds a second step: the two highest totals go to a runoff, and each ballot counts for whichever finalist it gave more stars. Bruno is starred above Camille on 19 ballots out of 30, so under STAR Bruno wins.',
    exaggerate:
      "Stars invite exaggeration. Why give your second choice 4 stars if they are the threat? Ana's group would rather have Daniel than Bruno.",
    challenge:
      "Change Ana's stars (click a star; click it again to remove one) to get Ana's group a mayor they prefer to Bruno under STAR.",
    success:
      "With Ana's new stars, {finalists} reach the runoff and {winner} wins it. The machine's favourite version: five stars for Daniel and for Erik, none for anyone else, which knocks Bruno (and Camille) out of the runoff.",
    lesson:
      "Exaggerating, giving only 0 or 5 stars, is the classic score-voting strategy, and once everyone does it score voting turns into approval voting. STAR's runoff takes some of the reward away, but as Ana's group shows, not all of it.",
    rounds: 'STAR, round by round',
  },

  t15: {
    intro:
      'The same 30 voters. The same honest opinions from start to finish. And {n} different mayors, depending only on how the ballots are counted.',
    pick: 'At the start you said <strong>{name}</strong> should be mayor.',
    pickWins: '{name} wins under {systems}.',
    pickNone: 'No system on this list elects {name}.',
    challenge: 'Read the table: what each system really asks.',
    success:
      'Each one answers a sensible question. They are just different questions, and with five candidates and a divided town, different questions have different answers.',
    lesson:
      'So which mayor is the right one? Every system above has a flaw, and every one of them could be gamed by someone in Riverton. Is there a system without flaws? In 1951, an economist proved there is not.',
    system: 'System',
    mayor: 'Mayor',
    asks: 'The question it asks',
    rigsTitle: 'How Riverton could have been rigged',
    rigItem: '<strong>{system}</strong> (honest result: {winner}): {rig}',
    rigItemPending: '<strong>{system}</strong>: {rig}',
    rows: {
      plurality: {
        system: 'One mark (plurality)',
        asks: 'Who has the most first choices?',
        rig: 'Leo’s group compromises on Bruno; withdrawing Amira hands Bruno the win.',
      },
      two_round: {
        system: 'Two rounds',
        asks: 'Of the top two by first choices, whom does a majority prefer?',
        rig: 'Four of Frank’s group switching to Amira, or staying home, make Amira lose.',
      },
      irv: {
        system: 'Instant runoff',
        asks: 'Who survives when the weakest are knocked out one by one?',
        rig: 'Some of Frank’s or Leo’s group staying home gets them Camille.',
      },
      borda: {
        system: 'Borda points',
        asks: 'Who has the best average place?',
        rig: 'Margaret’s group buries Camille; Bruno’s party fields a twin.',
      },
      schulze: {
        system: 'Head to head (Condorcet)',
        asks: 'Who beats everyone one on one?',
        rig: 'Ana’s group buries Bruno and fakes a cycle.',
      },
      approval: {
        system: 'Approval',
        asks: 'Whom do the most people accept?',
        rig: 'Nobody can, here; bullet votes backfire.',
      },
      star: {
        system: 'STAR',
        asks: 'Of the two best-rated, who is rated higher on more ballots?',
        rig: 'Ana’s group exaggerates its stars and gets Daniel.',
      },
    },
  },

  t16: {
    intro:
      "In 1951 the economist Kenneth Arrow wrote down four modest wishes for any system that turns voters' rankings into a ranking for the town:",
    wishes: {
      ranking: '<strong>Always a ranking.</strong> Whatever the ballots, the result is a consistent order.',
      unanimity: '<strong>Unanimity.</strong> If every voter prefers X to Y, so does the town.',
      independence:
        "<strong>Independence.</strong> The town's verdict on X versus Y depends only on how voters rank X versus Y. In other words, no spoilers: in Riverton, withdrawing Amira should not have changed Erik versus Bruno.",
      dictator: '<strong>No dictator.</strong> No single voter always gets their way.',
    },
    lab: 'The lab checks a rule against every possible election with three candidates and three voters, all 216 of them, and shows a concrete counterexample for every wish the rule breaks.',
    challenge: 'Find a rule that grants all four wishes. Try at least four rules.',
    success: 'Your best so far grants {best} of 4. Nobody will ever do better.',
    lesson:
      "<strong>Arrow's impossibility theorem</strong>: with three or more candidates, no ranked voting rule grants all four wishes. Pairwise majority fails the first (that's the Condorcet paradox); dictatorship grants the first three at the price of the fourth; every real system breaks unanimity or independence. Arrow won the Nobel prize in economics in 1972, partly for this.",
  },

  t17: {
    intro:
      "Arrow's theorem is about fairness. Its twin is about honesty. In 1973 and 1975 Allan Gibbard and Mark Satterthwaite proved that with three or more candidates, <strong>every</strong> voting system that is not a dictatorship (and can elect anyone) will, in some election, reward someone for lying.",
    check:
      "Let's check Riverton. The server will try every possible insincere ballot, for every group and every number of liars inside it, under each system.",
    searching: 'Trying every lie…',
    done: 'Done',
    search: 'Search for every profitable lie',
    challenge: 'Read the grid: a name in a cell means that group could get that mayor, whom they prefer, by lying.',
    success:
      "{riggable} of the {total} systems can be rigged by someone in Riverton. The exceptions here: {safe}. Under dictatorship only the dictator's ballot counts (here, Frank's group's), so nobody else's lies matter.",
    lesson:
      'Gibbard\'s version of the theorem covers every kind of ballot, ticks and stars included: approval is safe in Riverton, not in every town. There is no perfect voting system, only trade-offs between flaws, and it pays to know which flaws you are choosing. The <a href="/lab">theorem lab</a> measures how often each system can be gamed across thousands of random towns.',
    system: 'System',
    noLie: 'No profitable lie',
    waiting: 'Run the search to fill the grid.',
    tip: "{n} of {name}'s {total} voters, by {tactic}, get {winner} instead of {honest}. | {n} of {name}'s {total} voters, by {tactic}, get {winner} instead of {honest}.",
  },

  t18: {
    intro: 'You have seen the two great impossibility results of voting:',
    arrow: '<strong>Arrow:</strong> no ranked system is perfectly fair.',
    gibbard: '<strong>Gibbard–Satterthwaite:</strong> no system is immune to strategy.',
    outro:
      "That doesn't make every system equally bad. Each has its own way of going wrong and its own tricks for those who want to rig it. Now build your own town.",
    sandbox: 'Open the sandbox',
    rigging: 'Read the rigging handbook',
    lab: 'Visit the theorem lab',
    sheet: 'Cheat sheet',
    system: 'System',
    weak: 'Weak spot',
    rig: 'How to rig it',
    rows: {
      plurality: {
        system: 'One mark (plurality)',
        weak: 'Elects a minority favourite; spoilers',
        rig: 'Run a look-alike of your rival; vote for the lesser evil',
      },
      two_round: {
        system: 'Two rounds',
        weak: 'Gaining votes can lose; staying home can pay',
        rig: 'Pick your runoff opponent (push-over)',
      },
      irv: {
        system: 'Instant runoff',
        weak: 'Squeezes out the consensus candidate',
        rig: 'Stay home, or rank a rival first to change the eliminations',
      },
      borda: {
        system: 'Borda points',
        weak: 'Lower preferences are worth lying about',
        rig: 'Bury the rival; field clones',
      },
      condorcet: {
        system: 'Head to head',
        weak: 'Needs a rule for cycles',
        rig: 'Bury the Condorcet winner to fake a cycle',
      },
      approval: {
        system: 'Approval',
        weak: 'Where to draw the line',
        rig: 'Bullet vote (which can backfire)',
      },
      score: {
        system: 'Score / STAR',
        weak: 'Honest nuance loses to exaggeration',
        rig: 'Give only 0 or 5 stars',
      },
    },
  },
}
