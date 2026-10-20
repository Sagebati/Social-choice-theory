import type source from '../en/app'

const app: typeof source = {
  app: {
    title: 'Qui a vraiment gagné ?',
    description:
      'Un guide jouable des systèmes de vote : candidats trouble-fête, vainqueur de Condorcet, théorème d’Arrow, et comment truquer chaque méthode.',
    nav: {
      aria: 'Navigation principale',
      journey: 'Parcours',
      sandbox: 'Bac à sable',
      rigging: 'Manuel du truqueur',
      lab: 'Labo des théorèmes',
    },
    theme: {
      prefix: 'Thème : ',
      aria: 'Thème : {theme}. Changer de thème',
      auto: 'auto',
      light: 'clair',
      dark: 'sombre',
    },
    language: 'Langue',
    skip: 'Aller au contenu',
    footer:
      'Construit sur une bibliothèque Rust de théorie du choix social, servie par un Worker Cloudflare. Chaque résultat de cette page est calculé par le serveur, rien n’est recopié.',
  },

  common: {
    units: {
      votes: 'voix',
      points: 'points',
      approvals: 'approbations',
      stars: 'étoiles',
      score: 'note',
    },
    voters: '{n} électeur | {n} électeurs',
    apiError: 'Impossible de joindre l’API : {error}',
    tie: 'égalité',
    tieBetween: 'égalité : {names}',
    loading: 'Chargement…',
    close: 'Fermer',
  },

  methods: {
    plurality: 'Scrutin à un tour',
    anti_plurality: 'Vote par veto',
    two_round: 'Scrutin à deux tours',
    irv: 'Vote alternatif',
    coombs: 'Coombs',
    borda: 'Méthode Borda',
    agenda: 'Vote séquentiel',
    copeland: 'Copeland',
    minimax: 'Minimax',
    schulze: 'Schulze',
    ranked_pairs: 'Paires classées',
    approval: 'Vote par approbation',
    score: 'Vote par notes',
    star: 'STAR',
    dictatorship: 'Dictature',
  },

  tactics: {
    compromising: 'Vote utile',
    burying: 'Enterrement',
    compromising_and_burying: 'Vote utile + enterrement',
    push_over: 'Push-over',
    bullet_voting: 'Vote exclusif',
    exaggeration: 'Exagération',
  },

  ballot: {
    votes: 'vote {name}',
    vetoes: 'met son veto à {name}',
    approves: 'approuve {names}',
    approvesNobody: 'n’approuve personne',
  },

  tally: {
    aria: 'Décompte',
    ariaUnit: 'Décompte ({unit})',
    out: 'hors course',
    outOfRace: 'hors course',
    rowTitle: '{name} : {value}',
    eliminated: 'élimination',
    winner: 'vainqueur',
  },

  rounds: {
    of: 'tour {n} sur {total}',
    back: '← Retour',
    next: 'Tour suivant →',
    winner: 'Vainqueur : <strong>{name}</strong>',
    tiebreak: '(égalité départagée par l’ordre des candidats)',
  },

  winnerStrip: {
    condorcet: '✓ Condorcet',
    notCondorcet: '✗ pas Condorcet',
    champion: 'Champion des duels',
    cycle: 'personne : un cycle',
  },
}

export default app
