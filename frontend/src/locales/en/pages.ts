// The sandbox, the rigging handbook, the theorem lab and their components.

export default {
  sandbox: {
    title: 'Sandbox',
    intro:
      "Drag candidates and crowds, add more of each, let voters lie, and compare every method on the same voters. Click a method's card to colour the map by it.",
    mapLabel: 'Sandbox map',
    addCandidate: '+ Candidate',
    addCrowd: '+ Crowd',
    yee: 'Yee map ({method})',
    selectedCrowd: 'Selected crowd',
    removeCrowd: 'Remove crowd',
    crowdVoters: 'Voters: {n}',
    spread: 'Spread: {value}',
    strategic: 'Strategic voters: <strong>{share}</strong>',
    useRadius: 'Approve candidates within a fixed distance',
    radius: 'Approval radius: {value}',
    defaultApproval: 'Voters approve every candidate closer than their average distance.',
    compare: 'Methods to compare',
    spoiling: '⚠ {names} spoiling',
    notCondorcet: 'not the Condorcet winner',
    headToHead: 'Head to head',
    canLie: 'Can anyone win by lying under {method}?',
    wins: '{method}: {name} wins.',
    ties: '{method}: a tie between {names}.',
    yeeError: 'The Yee map could not be drawn: {error}',
  },

  mapLegend: {
    aria: 'Map key',
    dots: 'Each dot is a voter, coloured by the candidate their ballot puts first.',
    dotsRound: 'Each dot is a voter, coloured by the candidate their ballot counts for in this round.',
    rings: 'Ringed dots cast a strategic ballot.',
    yee: 'The shading shows who {method} elects when a crowd is centred on that spot.',
    voters: '{share} of voters',
    map: 'wins {share} of the map',
    none: 'No candidate left',
  },

  rigging: {
    eyebrow: 'A field guide for the curious, and the suspicious',
    title: 'How to rig an election',
    lede: "You don't need to stuff ballot boxes. Every voting method has blind spots, and anyone who understands them can turn them into an advantage. There are four levers: the <strong>counting rule</strong>, the <strong>menu</strong> of candidates, the <strong>ballots</strong> voters cast, and the <strong>order</strong> things are decided in. This guide covers what the voting method itself allows; gerrymandering, turnout and misinformation are a different (and darker) book.",
    tryTitle: 'Try it: {title}',
    condorcet: {
      title: 'The Condorcet winner',
      p1: 'Compare candidates two at a time. A candidate who beats every rival in these one-on-one majority votes is the <strong>Condorcet winner</strong> (after the Marquis de Condorcet, 1785). Electing anyone else means a majority preferred the Condorcet winner to your pick. Plurality, instant runoff, Borda and the rated methods can all miss them.',
      p2: 'The catch: there may be no Condorcet winner at all. Ada can beat Bea, Bea beat Cal and Cal beat Ada, each by a real majority. This is the <strong>Condorcet paradox</strong>, and it is where agenda-setters and buriers do their work.',
      play1: 'Play: one on one',
    },
    arrow: {
      title: "Arrow's impossibility theorem",
      p: 'Kenneth Arrow (1951) asked for a rule that turns any set of voter rankings into a ranking for society and is (1) always a consistent ranking, (2) respects unanimity, (3) ranks X against Y using only how voters rank X against Y (no spoilers), and (4) has no dictator. With three or more candidates, <strong>no rule can do all four</strong>. Every ranked method breaks at least one; which one it breaks is its personality.',
      lab: 'Check every election in the lab',
    },
    gibbard: {
      title: 'Gibbard–Satterthwaite',
      p: "The strategy-proofness twin of Arrow's theorem (Gibbard 1973, Satterthwaite 1975): with three or more candidates, every method that can elect any of them and is not a dictatorship sometimes rewards a voter for lying. Rigging can't be designed away. It can only be made rarer, riskier or harder to compute.",
      play: 'Play: the lesser evil',
    },
    tacticsTitle: 'The tactics',
    tactics: {
      compromising: {
        name: 'Compromising',
        text: 'Vote for a lesser evil above your real favourite, so a worse candidate loses. The engine of two-party politics.',
      },
      burying: {
        name: 'Burying',
        text: 'Rank a strong rival below candidates you actually think are worse. Deadly under Borda and Coombs; the only way to attack a Condorcet method.',
      },
      pushOver: {
        name: 'Push-over',
        text: 'Boost a candidate you don’t want, so your favourite faces an easier opponent or a dangerous rival is eliminated early. Only works where the count isn’t monotonic, as in runoffs.',
      },
      bullet: {
        name: 'Bullet voting',
        text: 'Support only your favourite, so your other preferences can’t help them lose. The classic approval and score voting worry.',
      },
      exaggeration: {
        name: 'Exaggeration',
        text: 'Use only the top and bottom of a score scale. Rated methods reward it; STAR’s runoff limits it.',
      },
      spoilers: {
        name: 'Spoilers and clones',
        text: 'Change the menu instead of the ballots: sponsor a look-alike to split a rival’s vote (plurality), or run a team of clones to collect extra points (Borda).',
      },
      agenda: {
        name: 'Agenda control',
        text: 'When the majority goes in circles, whoever sets the order of votes picks the winner.',
      },
      abstention: {
        name: 'Strategic abstention',
        text: 'Under many methods staying home can produce a result you like better (the no-show paradox).',
      },
    },
    families: {
      positional: { title: 'Positional methods', blurb: 'Points by position on the ballot.' },
      runoff: { title: 'Runoff methods', blurb: 'Count, eliminate, count again.' },
      condorcet: { title: 'Condorcet methods', blurb: 'Built on head-to-head contests.' },
      cardinal: { title: 'Rated methods', blurb: 'Voters grade candidates instead of ranking them.' },
      degenerate: { title: 'The control group', blurb: 'What Arrow’s theorem says you are left with.' },
    },
    usedIn: 'Used in:',
    howToRig: 'How to rig it',
    tryIt: 'Try it',
    criteriaAria: 'Criteria',
    satisfied: 'satisfied',
    canFail: 'can fail',
  },

  lab: {
    title: 'Theorem lab',
    intro:
      'The machinery behind the journey, with every knob exposed. Everything here is computed on the server by the Rust library, by brute force where possible.',
    winners: {
      title: 'Same ballots, many winners',
      text: 'Edit the ballots, or shuffle in a random election. This one currently has <strong>{distinct}</strong> different outcome across the {methods} methods. | Edit the ballots, or shuffle in a random election. This one currently has <strong>{distinct}</strong> different outcomes across the {methods} methods.',
      random: 'Random election',
    },
    arrow: {
      title: "Arrow's theorem, by brute force",
      text: "Pick a rule. The server builds every possible election with three candidates and the chosen number of voters, and checks Arrow's four conditions on each. If a condition fails, you get the most telling counterexample.",
    },
    criteria: {
      title: 'Fairness criteria',
      text: 'Which method guarantees what. Every ✗ is backed by a real counterexample: click one and the server searches random elections until it finds an election that breaks the rule, then shrinks it.',
    },
    manipulability: {
      title: 'How manipulable is each method?',
      text: 'For each random election, the server tries every possible insincere ballot for every bloc of voters and checks whether any of them would get a result the bloc prefers.',
      candidates: 'Candidates',
      running: 'Running…',
      run: 'Run the experiment',
      done: 'Experiment finished. Most manipulable: {most} ({mostShare}). Least: {least} ({leastShare}).',
    },
  },

  arrowLab: {
    pairwiseMajority: 'Pairwise majority',
    ruleAria: 'Voting rule',
    voters: 'Voters',
    checking: 'checking all {n} possible elections with 3 candidates',
    score: '<strong>{rule}</strong> grants <strong>{met} of 4</strong> wishes.',
    conditions: {
      transitivity: {
        title: 'Always a ranking',
        wish: 'Whatever the ballots, society gets a consistent ranking (no A > B > C > A).',
      },
      pareto: { title: 'Unanimity', wish: 'If every voter prefers X to Y, society does too.' },
      iia: {
        title: 'Independence',
        wish: 'How society ranks X against Y depends only on how voters rank X against Y.',
      },
      dictator: { title: 'No dictator', wish: 'No single voter always gets their way.' },
    },
    satisfied: 'satisfied',
    violated: 'violated',
    verdict: {
      cycle: 'no verdict (cycle)',
      tied: '{a} and {b} tied',
      above: '{a} above {b}',
    },
    transitivity: {
      title: 'Why it fails "always a ranking"',
      text: 'Society finds {a} at least as good as {b}, and {b} at least as good as {c}, yet {c} beats {a}. The majority goes round in circles, so there is no ranking to report.',
    },
    pareto: {
      title: 'Why it fails unanimity',
      text: 'Every voter ranks {better} above {worse}, but society has {verdict}.',
    },
    iia: {
      title: 'Why it fails independence',
      text: 'In both elections, each voter ranks {a} against {b} exactly the same way. Only {voters} changed, and only about where the third candidate goes. Yet society flips from <strong>{first}</strong> to <strong>{second}</strong>.',
      voter: 'voter {n}',
      election1: 'Election 1',
      election2: 'Election 2',
    },
    dictator: {
      title: 'Why it fails "no dictator"',
      text: "In every one of the {n} elections, society copies voter {voter}'s preferences exactly. Everyone else might as well stay home.",
    },
  },

  arrowProfile: {
    voter: 'Voter {n}',
    society: 'Society',
    noRanking: 'no ranking',
    cycle: '(a cycle)',
  },

  counterexample: {
    before: 'Before',
    election: 'The election',
    after: 'After',
    elects: '{method} elects <strong>{winner}</strong>',
  },

  criteriaTable: {
    method: 'Method',
    short: {
      majority: 'Majority',
      condorcet_winner: 'Condorcet winner',
      condorcet_loser: 'Condorcet loser',
      pareto: 'Unanimity',
      monotonicity: 'Monotonic',
      participation: 'Participation',
      iia: 'No spoilers (IIA)',
      clones: 'Clone-proof',
    },
    always: '{method} always satisfies {criterion}',
    satisfied: 'always satisfied',
    aria: 'Methods against fairness criteria',
    found: 'Counterexample found.',
    show: 'Show an election where {method} breaks {criterion}',
    failsAria: '{method} fails {criterion}: show an example',
    legend: '✓ always satisfied · ✗ can fail: tap it and the server will search for a concrete election.',
    versus: '{method} vs {criterion}',
    searching: 'Searching random elections…',
    empty: 'The search came back empty this time.',
  },

  duelGraph: {
    list: 'Every head-to-head contest',
    beatsBy: '{a} beats {b}, {for} to {against}.',
    tiesWith: '{a} and {b} tie, {for} to {against}.',
    beatsEveryone: '{name} beats everyone head to head.',
    beats: 'beats',
    cycle: 'No Condorcet winner: {cycle}.',
    ties: 'No Condorcet winner (some contests are tied).',
  },

  manipulability: {
    aria: 'Share of random elections that can be manipulated, by method',
    rowTitle: '{method}: {n} of {samples} elections manipulable ({share})',
    caption: '{samples} random elections with {candidates} candidates; the same elections for every method.',
  },

  manipulationFinder: {
    searching: 'Searching every possible lie…',
    find: 'Find a profitable lie ({method})',
    none: 'No bloc of voters can get a better result by lying here. Not every election is manipulable, but the Gibbard–Satterthwaite theorem says some always are.',
    liars: '{n} liar | {n} liars',
    apply: 'Apply this lie',
    partOnly: 'Only the part of the ballot this method reads is changed.',
    found: 'Found {n} profitable lie. | Found {n} profitable lies.',
  },

  profileEditor: {
    fewer: 'Fewer voters in bloc {n}',
    votersIn: 'Voters in bloc {n}',
    more: 'More voters in bloc {n}',
    voters: 'voter | voters',
    rankingAria: 'Ranking of bloc {n}',
    moveUp: 'Move {name} up this ballot',
    position: '{pos}: {name}',
    positionMovable: '{pos}: {name}, move up',
    remove: 'Remove',
    addBloc: '+ Add a bloc of voters',
    hint: "Tap a candidate to move them up that bloc's ballot.",
    moved: '{name} now {pos} in bloc {n}',
  },

  scenarioLab: {
    ballotBox: 'The ballot box',
    reset: 'Reset',
    rigUnder: 'Rig it under',
    methodAria: 'Method to manipulate',
  },

  spatialMap: {
    label: 'Opinion map',
    candidateAt: '{name} at {x}, {y}',
    describe: '{label}. Candidates: {candidates}. Use the arrow keys on a focused token to move it.',
    crowd: 'Crowd of {n} voter | Crowd of {n} voters',
    winning: '{name}, winning',
    you: 'You',
    crowdAt: 'Crowd of {n} voter at {x}, {y} | Crowd of {n} voters at {x}, {y}',
    howToMove: '{position}. Use the arrow keys to move it, with Shift for bigger steps.',
  },
}
