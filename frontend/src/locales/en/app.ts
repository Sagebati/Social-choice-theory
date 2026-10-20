// The site's chrome and the components every page shares.

export default {
  app: {
    title: 'Who Really Won?',
    description:
      "A playable guide to voting systems: spoilers, Condorcet winners, Arrow's theorem, and how every method can be gamed.",
    nav: {
      aria: 'Main',
      journey: 'Journey',
      sandbox: 'Sandbox',
      rigging: 'Rigging handbook',
      lab: 'Theorem lab',
    },
    theme: {
      prefix: 'Theme: ',
      aria: 'Theme: {theme}. Change theme',
      auto: 'auto',
      light: 'light',
      dark: 'dark',
    },
    language: 'Language',
    footer:
      'Built on a Rust library of social choice theory, compiled to WebAssembly and run in your browser. Every result on this page is computed as you go, not looked up.',
  },

  common: {
    units: {
      votes: 'votes',
      points: 'points',
      approvals: 'approvals',
      stars: 'stars',
      score: 'score',
    },
    voters: '{n} voter | {n} voters',
    apiError: 'The calculation failed: {error}',
    tie: 'tie',
    tieBetween: 'tie: {names}',
    loading: 'Loading…',
    close: 'Close',
  },

  methods: {
    plurality: 'Plurality',
    anti_plurality: 'Anti-plurality',
    two_round: 'Two-round runoff',
    irv: 'Instant runoff',
    coombs: 'Coombs',
    borda: 'Borda count',
    agenda: 'Agenda',
    copeland: 'Copeland',
    minimax: 'Minimax',
    schulze: 'Schulze',
    ranked_pairs: 'Ranked pairs',
    approval: 'Approval',
    score: 'Score',
    star: 'STAR',
    dictatorship: 'Dictatorship',
  },

  tactics: {
    compromising: 'Compromising',
    burying: 'Burying',
    compromising_and_burying: 'Compromising + burying',
    push_over: 'Push-over',
    bullet_voting: 'Bullet voting',
    exaggeration: 'Exaggeration',
  },

  ballot: {
    votes: 'votes {name}',
    vetoes: 'vetoes {name}',
    approves: 'approves {names}',
    approvesNobody: 'approves nobody',
  },

  tally: {
    aria: 'Tally',
    ariaUnit: 'Tally ({unit})',
    out: 'out',
    outOfRace: 'out of the race',
    rowTitle: '{name}: {value}',
    eliminated: 'eliminated',
    winner: 'winner',
  },

  rounds: {
    of: 'round {n} of {total}',
    back: '← Back',
    next: 'Next round →',
    winner: 'Winner: <strong>{name}</strong>',
    tiebreak: '(a tie was broken by candidate order)',
  },

  winnerStrip: {
    condorcet: '✓ Condorcet',
    notCondorcet: '✗ not Condorcet',
    champion: 'Head-to-head champion',
    cycle: 'nobody: a cycle',
  },
}
