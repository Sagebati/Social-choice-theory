import type source from '../en/pages'

const messages: typeof source = {
  sandbox: {
    title: 'Bac à sable',
    intro:
      'Déplacez candidats et foules, ajoutez-en d’autres, laissez les électeurs mentir, et comparez toutes les méthodes sur les mêmes électeurs. Cliquez sur une méthode pour colorer la carte selon son résultat.',
    mapLabel: 'Carte du bac à sable',
    addCandidate: '+ Candidat',
    removeCandidate: 'Retirer {name}',
    addCrowd: '+ Foule',
    yee: 'Diagramme de Yee ({method})',
    selectedCrowd: 'Foule sélectionnée',
    removeCrowd: 'Supprimer la foule',
    crowdVoters: 'Électeurs : {n}',
    spread: 'Dispersion : {value}',
    strategic: 'Électeurs stratèges : <strong>{share}</strong>',
    useRadius: 'Approuver les candidats situés à moins d’une distance fixe',
    radius: 'Rayon d’approbation : {value}',
    defaultApproval: 'Chaque électeur approuve tous les candidats plus proches que sa distance moyenne.',
    compare: 'Méthodes à comparer',
    spoiling: '⚠ trouble-fête : {names}',
    notCondorcet: 'pas le vainqueur de Condorcet',
    headToHead: 'Face-à-face',
    canLie: 'Peut-on gagner en mentant avec la méthode « {method} » ?',
    wins: '{method} : {name} gagne.',
    ties: '{method} : égalité entre {names}.',
    yeeError: 'Le diagramme de Yee n’a pas pu être tracé : {error}',
  },

  mapLegend: {
    aria: 'Légende de la carte',
    dots: 'Chaque point est un électeur, coloré selon le candidat que son bulletin place en tête.',
    dotsRound: 'Chaque point est un électeur, coloré selon le candidat pour qui son bulletin compte à ce tour.',
    rings: 'Les points cerclés ont voté de façon stratégique.',
    yee: 'Les zones colorées montrent qui la méthode « {method} » élit quand une foule est centrée à cet endroit.',
    voters: '{share} des électeurs',
    map: 'gagne sur {share} de la carte',
    none: 'Plus aucun candidat',
  },

  rigging: {
    eyebrow: 'Un guide de terrain pour les curieux, et les soupçonneux',
    title: 'Comment truquer une élection',
    lede: 'Inutile de bourrer les urnes. Chaque méthode de vote a ses angles morts, et quiconque les comprend peut les retourner à son avantage. Il y a quatre leviers : la <strong>règle de décompte</strong>, le <strong>menu</strong> des candidats, les <strong>bulletins</strong> que glissent les électeurs, et l’<strong>ordre</strong> dans lequel on tranche. Ce guide traite de ce que permet la méthode de vote elle-même ; le découpage des circonscriptions, la participation et la désinformation relèvent d’un autre livre, plus sombre.',
    tryTitle: 'À l’essai : {title}',
    condorcet: {
      title: 'Le vainqueur de Condorcet',
      p1: 'Comparez les candidats deux à deux. Celui qui bat chacun de ses rivaux dans ces votes majoritaires en face-à-face est le <strong>vainqueur de Condorcet</strong> (d’après le marquis de Condorcet, 1785). Élire quelqu’un d’autre, c’est passer outre une majorité qui lui préférait le vainqueur de Condorcet. Le scrutin à un tour, le vote alternatif, Borda et les méthodes à notes peuvent tous le manquer.',
      p2: 'Le hic : il n’y a pas toujours de vainqueur de Condorcet. Ada peut battre Bea, Bea battre Cal et Cal battre Ada, chaque fois avec une vraie majorité. C’est le <strong>paradoxe de Condorcet</strong>, le terrain de jeu de ceux qui fixent l’ordre du jour et de ceux qui enterrent leurs rivaux.',
      play1: 'Jouer : un contre un',
    },
    arrow: {
      title: 'Le théorème d’impossibilité d’Arrow',
      p: 'Kenneth Arrow (1951) cherchait une règle qui transforme n’importe quels classements des électeurs en un classement pour la société et qui (1) donne toujours un classement cohérent, (2) respecte l’unanimité, (3) classe X face à Y d’après la seule façon dont les électeurs classent X face à Y (pas de trouble-fête) et (4) n’a pas de dictateur. Dès trois candidats, <strong>aucune règle ne remplit les quatre conditions</strong>. Chaque méthode à classement en viole au moins une ; laquelle, c’est sa personnalité.',
      lab: 'Vérifier chaque élection au labo',
    },
    gibbard: {
      title: 'Gibbard-Satterthwaite',
      p: 'Le jumeau du théorème d’Arrow, côté stratégie (Gibbard 1973, Satterthwaite 1975) : dès trois candidats, toute méthode qui peut élire chacun d’eux et n’est pas une dictature récompense parfois un électeur qui ment. Aucune règle, si bien conçue soit-elle, ne fait disparaître la triche. On peut seulement la rendre plus rare, plus risquée ou plus difficile à calculer.',
      play: 'Jouer : le vote utile',
    },
    tacticsTitle: 'Les tactiques',
    tactics: {
      compromising: {
        name: 'Vote utile',
        text: 'Placer un moindre mal au-dessus de son vrai favori, pour qu’un candidat pire perde. C’est le moteur du bipartisme.',
      },
      burying: {
        name: 'Enterrement',
        text: 'Classer un rival sérieux sous des candidats qu’on juge en réalité pires. Redoutable avec Borda et Coombs ; c’est la seule façon d’attaquer une méthode de Condorcet.',
      },
      pushOver: {
        name: 'Push-over',
        text: 'Soutenir un candidat dont on ne veut pas, pour que son favori affronte un adversaire plus facile ou qu’un rival dangereux soit éliminé tôt. Ne marche que là où le décompte n’est pas monotone, comme dans les scrutins à plusieurs tours.',
      },
      bullet: {
        name: 'Vote exclusif',
        text: 'Ne soutenir que son favori, pour que ses autres préférences ne puissent pas le faire perdre. La grande crainte du vote par approbation et du vote par notes.',
      },
      exaggeration: {
        name: 'Exagération',
        text: 'N’utiliser que le haut et le bas de l’échelle de notes. Les méthodes à notes la récompensent ; le second tour de STAR la limite.',
      },
      spoilers: {
        name: 'Trouble-fête et clones',
        text: 'Changer le menu plutôt que les bulletins : financer un sosie de son rival pour diviser ses voix (scrutin à un tour), ou présenter une équipe de clones pour rafler des points en plus (Borda).',
      },
      agenda: {
        name: 'Contrôle de l’ordre du jour',
        text: 'Quand la majorité tourne en rond, celui qui fixe l’ordre des votes choisit le vainqueur.',
      },
      abstention: {
        name: 'Abstention stratégique',
        text: 'Avec bien des méthodes, rester chez soi peut donner un résultat qu’on préfère (le paradoxe de l’abstention).',
      },
    },
    families: {
      positional: { title: 'Méthodes positionnelles', blurb: 'Des points selon la place sur le bulletin.' },
      runoff: { title: 'Méthodes par élimination', blurb: 'Compter, éliminer, recompter.' },
      condorcet: { title: 'Méthodes de Condorcet', blurb: 'Fondées sur les face-à-face.' },
      cardinal: { title: 'Méthodes à notes', blurb: 'Les électeurs notent les candidats au lieu de les classer.' },
      degenerate: { title: 'Le groupe témoin', blurb: 'Ce qui vous reste, d’après le théorème d’Arrow.' },
    },
    usedIn: 'Utilisé pour :',
    howToRig: 'Comment la truquer',
    tryIt: 'Essayer',
    criteriaAria: 'Critères',
    satisfied: 'respecté',
    canFail: 'peut échouer',
  },

  lab: {
    title: 'Labo des théorèmes',
    intro:
      'La mécanique derrière le parcours, tous les réglages à portée de main. Tout ici est calculé sur le serveur par la bibliothèque Rust, par force brute quand c’est possible.',
    winners: {
      title: 'Mêmes bulletins, plusieurs vainqueurs',
      text: 'Modifiez les bulletins, ou tirez une élection au hasard. Celle-ci donne pour l’instant <strong>{distinct}</strong> seul résultat pour les {methods} méthodes. | Modifiez les bulletins, ou tirez une élection au hasard. Celle-ci donne pour l’instant <strong>{distinct}</strong> résultats différents selon les {methods} méthodes.',
      random: 'Élection au hasard',
    },
    arrow: {
      title: 'Le théorème d’Arrow, par force brute',
      text: 'Choisissez une règle. Le serveur construit toutes les élections possibles à trois candidats avec le nombre d’électeurs choisi, et vérifie sur chacune les quatre conditions d’Arrow. Si une condition tombe, vous obtenez le contre-exemple le plus parlant.',
    },
    criteria: {
      title: 'Critères d’équité',
      text: 'Quelle méthode garantit quoi. Chaque ✗ s’appuie sur un vrai contre-exemple : cliquez dessus, et le serveur fouille des élections aléatoires jusqu’à en trouver une qui enfreint la règle, puis la réduit au minimum.',
    },
    manipulability: {
      title: 'À quel point chaque méthode est-elle manipulable ?',
      text: 'Pour chaque élection aléatoire, le serveur essaie tous les bulletins insincères possibles pour chaque bloc d’électeurs, et regarde si l’un d’eux donnerait un résultat que ce bloc préfère.',
      candidates: 'Candidats',
      running: 'Calcul en cours…',
      run: 'Lancer l’expérience',
      done: 'Expérience terminée. La plus manipulable : {most} ({mostShare}). La moins : {least} ({leastShare}).',
    },
  },

  arrowLab: {
    pairwiseMajority: 'Majorité en duel',
    ruleAria: 'Règle de vote',
    voters: 'Électeurs',
    checking: 'vérification des {n} élections possibles à 3 candidats',
    score: 'Vœux exaucés par <strong>{rule}</strong> : <strong>{met} sur 4</strong>.',
    conditions: {
      transitivity: {
        title: 'Toujours un classement',
        wish: 'Quels que soient les bulletins, la société obtient un classement cohérent (pas de A > B > C > A).',
      },
      pareto: { title: 'Unanimité', wish: 'Si tous les électeurs préfèrent X à Y, la société aussi.' },
      iia: {
        title: 'Indépendance',
        wish: 'Le classement de X face à Y par la société ne dépend que de la façon dont les électeurs classent X face à Y.',
      },
      dictator: { title: 'Pas de dictateur', wish: 'Aucun électeur n’obtient à lui seul toujours gain de cause.' },
    },
    satisfied: 'respectée',
    violated: 'violée',
    verdict: {
      cycle: 'pas de verdict (cycle)',
      tied: '{a} et {b} à égalité',
      above: '{a} devant {b}',
    },
    transitivity: {
      title: 'Pourquoi « toujours un classement » tombe',
      text: 'La société met {a} au moins à égalité avec {b}, et {b} au moins à égalité avec {c}, et pourtant {c} bat {a}. La majorité tourne en rond : il n’y a aucun classement à annoncer.',
    },
    pareto: {
      title: 'Pourquoi l’unanimité tombe',
      text: 'Tous les électeurs classent {better} devant {worse}, mais pour la société : {verdict}.',
    },
    iia: {
      title: 'Pourquoi l’indépendance tombe',
      text: 'Dans les deux élections, chaque électeur classe {a} face à {b} exactement de la même façon. Les seuls changements viennent de {voters}, et ne portent que sur la place du troisième candidat. Pourtant, la société passe de <strong>{first}</strong> à <strong>{second}</strong>.',
      voter: 'l’électeur {n}',
      election1: 'Élection 1',
      election2: 'Élection 2',
    },
    dictator: {
      title: 'Pourquoi « pas de dictateur » tombe',
      text: 'Dans chacune des {n} élections, la société recopie exactement les préférences de l’électeur {voter}. Les autres pourraient aussi bien rester chez eux.',
    },
  },

  arrowProfile: {
    voter: 'Électeur {n}',
    society: 'Société',
    noRanking: 'pas de classement',
    cycle: '(un cycle)',
  },

  counterexample: {
    before: 'Avant',
    election: 'L’élection',
    after: 'Après',
    elects: 'Résultat ({method}) : <strong>{winner}</strong>',
  },

  criteriaTable: {
    method: 'Méthode',
    short: {
      majority: 'Majorité',
      condorcet_winner: 'Vainqueur de Condorcet',
      condorcet_loser: 'Perdant de Condorcet',
      pareto: 'Unanimité',
      monotonicity: 'Monotonie',
      participation: 'Participation',
      iia: 'Sans trouble-fête (IIA)',
      clones: 'Insensible aux clones',
    },
    always: '{method} respecte toujours le critère « {criterion} »',
    satisfied: 'toujours respecté',
    aria: 'Les méthodes face aux critères d’équité',
    found: 'Contre-exemple trouvé.',
    show: 'Montrer une élection où {method} enfreint le critère « {criterion} »',
    failsAria: '{method} enfreint le critère « {criterion} » : voir un exemple',
    legend: '✓ toujours respecté · ✗ peut échouer : touchez-le et le serveur cherchera une élection concrète.',
    versus: '{method} face au critère « {criterion} »',
    searching: 'Recherche parmi des élections aléatoires…',
    empty: 'La recherche n’a rien donné cette fois-ci.',
  },

  duelGraph: {
    list: 'Tous les face-à-face',
    beatsBy: '{a} bat {b}, {for} à {against}.',
    tiesWith: '{a} et {b} sont à égalité, {for} à {against}.',
    beatsEveryone: '{name} bat tout le monde en face-à-face.',
    beats: 'bat',
    cycle: 'Pas de vainqueur de Condorcet : {cycle}.',
    ties: 'Pas de vainqueur de Condorcet (certains duels sont à égalité).',
  },

  manipulability: {
    aria: 'Part des élections aléatoires manipulables, par méthode',
    rowTitle: '{method} : {n} élections manipulables sur {samples} ({share})',
    caption: '{samples} élections aléatoires à {candidates} candidats ; les mêmes pour toutes les méthodes.',
  },

  manipulationFinder: {
    searching: 'Recherche de tous les mensonges possibles…',
    find: 'Trouver un mensonge payant ({method})',
    none: 'Ici, aucun bloc d’électeurs ne peut obtenir un meilleur résultat en mentant. Toutes les élections ne sont pas manipulables, mais le théorème de Gibbard-Satterthwaite garantit que certaines le sont toujours.',
    liars: '{n} menteur | {n} menteurs',
    apply: 'Appliquer ce mensonge',
    partOnly: 'Seule la partie du bulletin que lit cette méthode est modifiée.',
    found: '{n} mensonge payant trouvé. | {n} mensonges payants trouvés.',
  },

  profileEditor: {
    fewer: 'Moins d’électeurs dans le bloc {n}',
    votersIn: 'Électeurs du bloc {n}',
    more: 'Plus d’électeurs dans le bloc {n}',
    voters: 'électeur | électeurs',
    rankingAria: 'Classement du bloc {n}',
    moveUp: 'Faire monter {name} sur ce bulletin',
    position: '{pos} : {name}',
    positionMovable: '{pos} : {name}, faire monter',
    remove: 'Supprimer',
    addBloc: '+ Ajouter un bloc d’électeurs',
    hint: 'Touchez un candidat pour le faire monter sur le bulletin de ce bloc.',
    moved: '{name} passe en {pos} position dans le bloc {n}',
  },

  scenarioLab: {
    ballotBox: 'L’urne',
    reset: 'Réinitialiser',
    rigUnder: 'Truquer avec',
    methodAria: 'Méthode à manipuler',
  },

  spatialMap: {
    label: 'Carte des opinions',
    candidateAt: '{name} en {x}, {y}',
    describe:
      '{label}. Candidats : {candidates}. Utilisez les flèches du clavier sur un jeton sélectionné pour le déplacer.',
    crowd: 'Foule de {n} électeur | Foule de {n} électeurs',
    winning: '{name}, en tête',
    you: 'Vous',
    crowdAt: 'Foule de {n} électeur en {x}, {y} | Foule de {n} électeurs en {x}, {y}',
    howToMove: '{position}. Utilisez les flèches pour le déplacer, avec Maj pour aller plus vite.',
  },
}

export default messages
