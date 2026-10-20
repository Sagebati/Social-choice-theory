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
    skip: 'Skip to content',
    footer:
      'Built on a Rust library of social choice theory, served from a Cloudflare Worker. Every result on this page is computed by the server, not looked up.',
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
    apiError: 'Could not reach the API: {error}',
    tie: 'tie',
    tieBetween: 'tie: {names}',
    loading: 'Loading…',
    close: 'Close',
    resultsError: 'The results could not be updated: {error}',
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
    tally: '{name} {value}',
    summary: '{round}: {tallies}.',
  },

  winnerStrip: {
    condorcet: '✓ Condorcet',
    notCondorcet: '✗ not Condorcet',
    champion: 'Head-to-head champion',
    cycle: 'nobody: a cycle',
    wins: '{name} wins under {methods}.',
    tied: 'A tie between {names} under {methods}.',
    championIs: 'Head-to-head champion: {name}.',
    noChampion: 'No head-to-head champion: the majorities go round in a cycle.',
  },
}
