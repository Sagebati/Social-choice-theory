import type source from '../en/journey2'

const messages: typeof source = {
  t10: {
    intro:
      'Quand on lui fit remarquer que sa méthode était facile à manipuler, Jean-Charles de Borda, savant de l’Académie des sciences, aurait répondu : <em>« Mon scrutin n’est fait que pour d’honnêtes gens. »</em> Deux ruses montrent ce qui l’inquiétait.',
    tabBury: 'Ruse n° 1 : l’enterrement',
    tabTeam: 'Ruse n° 2 : faire équipe',
    bury: 'Avec Borda, l’ordre du <em>bas</em> de votre bulletin rapporte aussi des points. Un groupe peut donc pousser un rival tout en bas de son bulletin, sous des candidats qu’il aime en réalité moins. C’est l’<strong>enterrement</strong>.',
    buryChallenge:
      'Modifiez le classement d’<strong>un seul</strong> groupe (avec les boutons ↑) pour que Riverton ait un maire que ce groupe préfère à Camille. Bloqué ? Demandez à la machine, plus bas.',
    burySuccess:
      'Il suffisait aux 3 électeurs de Margaret de faire passer Camille de la quatrième à la dernière place : Camille perd 3 points, et Bruno l’emporte. Personne n’a changé d’avis sur Bruno.',
    team: 'Le parti de Bruno a une autre idée : présenter <strong>{clone}</strong>, la colistière de Bruno. Gina défend exactement le même programme que Bruno, si bien que chaque électeur la classe juste après Bruno.',
    enter: 'Gina entre dans la course',
    teamChallenge: 'Faites entrer Gina en lice et regardez qui remporte le décompte de Borda.',
    teamSuccess:
      'Gina ne gagne rien. Mais sur chaque bulletin, Gina s’intercale entre Bruno et tous ceux qui sont classés sous Bruno : Bruno prend ainsi un point d’avance sur chacun d’eux, 30 points en tout, et devient maire. Le vote alternatif, qui ne regarde que les premiers choix, élit toujours {irv}.',
    lesson:
      'La méthode de Borda est la plus exposée à la stratégie : enterrer un rival ou présenter des candidats sosies (<strong>faire équipe</strong>) rapporte des points sans changer l’opinion d’un seul électeur.',
    live: 'Points de Borda, en direct',
  },

  t11: {
    intro:
      'En 1785, le marquis de Condorcet, membre comme Borda de l’Académie des sciences, propose le test le plus naturel qui soit : opposer les candidats <strong>deux par deux</strong>. Qui une majorité choisirait-elle, Amira ou Bruno ? Bruno ou Camille ? Il y a dix duels de ce genre.',
    winner:
      'Un candidat qui gagne <strong>tous</strong> ses duels est le <strong>vainqueur de Condorcet</strong>. Quel que soit l’autre candidat choisi, une majorité lui aurait préféré le vainqueur de Condorcet. Les méthodes qui l’élisent toujours (Schulze, paires classées, Copeland, minimax) s’appellent les méthodes de Condorcet.',
    question: 'Qui gagne tous ses duels ?',
    challenge:
      'Choisissez deux candidats sous le diagramme, ou utilisez les raccourcis, pour voir quels groupes soutiennent qui. Examinez trois duels.',
    success:
      'Bruno bat tout le monde : Amira 18 à 12, Camille 19 à 11, Daniel 19 à 11, Erik 16 à 14. Cinquième système, cinquième maire. Et Erik, élu par le scrutin à un tour, perd absolument tous ses duels.',
    lesson:
      'Mêmes électeurs, cinq systèmes, cinq maires différents : Erik, Amira, Daniel, Camille, Bruno. Chaque système est « juste » selon une certaine définition, et chacun pose une question différente aux mêmes bulletins.',
    duel: 'Duel',
    first: 'Premier candidat',
    second: 'Second candidat',
    versus: 'contre',
    showTable: 'Afficher les dix duels dans un tableau',
    hideTable: 'Masquer le tableau des dix duels',
    quick: '{a} contre {b}',
    waiting: 'Faites un pronostic pour lancer les duels.',
  },

  t12: {
    paradox:
      'Condorcet avait lui-même repéré la faille de son idée. Parfois, personne ne gagne tous ses duels : A bat B, B bat C et C bat A, comme à pierre-feuille-ciseaux. C’est le <strong>paradoxe de Condorcet</strong>. Toute méthode de Condorcet a besoin d’une règle pour briser ces cycles, en général en ignorant le maillon le plus faible.',
    manufacture:
      'Riverton n’a pas de cycle : Bruno est clairement le vainqueur de Condorcet. Mais le groupe d’Ana, qui veut Camille, pourrait en <em>fabriquer</em> un, en classant Bruno plus bas qu’il ne le pense vraiment. C’est encore l’<strong>enterrement</strong>.',
    challenge:
      'Ne modifiez que le bulletin d’Ana (avec les boutons ↑) pour que Camille devienne maire avec les méthodes de Condorcet.',
    success:
      'Relégué sous Amira ou Erik sur le bulletin d’Ana, Bruno perd désormais ce duel : plus personne ne bat tout le monde. Les duels tournent en rond, et quand les méthodes de Condorcet brisent le cycle à son maillon le plus faible, c’est Camille qui sort en tête. Les six électeurs d’Ana ont fait élire Camille sans que personne change d’avis.',
    lesson:
      'On ne peut manipuler une méthode de Condorcet qu’en créant un cycle, ce qui suppose de bien connaître les bulletins de tous les autres, et le coup peut se retourner contre vous : si les partisans de Bruno enterrent Camille en retour, tout le monde y perd. Ces méthodes sont donc difficiles à truquer, mais pas impossibles.',
  },

  t13: {
    intro:
      'Classer tout le monde, c’est beaucoup demander. Le <strong>vote par approbation</strong> demande moins : cochez chaque candidat qui vous conviendrait. Le candidat qui a le plus de coches l’emporte. Fargo, dans le Dakota du Nord, et Saint-Louis, dans le Missouri, désignent ainsi leurs élus municipaux.',
    topTwo: 'Ici, chaque groupe coche ses deux premiers choix.',
    question: 'Qui reçoit le plus de coches ?',
    dilemma:
      'Bruno, encore : pour la première fois, deux systèmes tombent d’accord. L’approbation et les duels choisissent tous deux le candidat que personne ne déteste. Reste un dilemme : un groupe a-t-il vraiment intérêt à cocher son deuxième choix ? Une coche pour votre deuxième choix pourrait l’aider à battre votre premier.',
    challenge:
      'Faites pratiquer le <strong>vote exclusif</strong> à un groupe : décochez tout sur son bulletin sauf son favori. Trouvez un groupe pour qui cela se retourne contre lui.',
    success:
      'Sans les coches pour Bruno, Daniel l’emporte, et Frank comme Leo classent Daniel quatrième. Le vote exclusif, qui semblait sans risque, leur a donné un pire maire.',
    askMachine: 'Un groupe peut-il truquer le vote par approbation ici ? Demandez à la machine :',
    lesson:
      'L’approbation n’a pas de trouble-fête : cocher un nom de plus ne retire jamais de coche à personne. Sa difficulté stratégique, c’est de savoir où tracer la limite. À Riverton, personne ne gagne à la déplacer, mais dans une course plus serrée, les groupes qui soutiennent deux candidats proches se livrent à un jeu de la poule mouillée : celui qui cesse le premier de cocher l’autre peut gagner, ou les faire perdre tous les deux.',
    ticks: 'Coches',
    unit: 'coches',
    waiting: 'Faites un pronostic pour compter les coches.',
  },

  t14: {
    score:
      'Le <strong>vote par notes</strong> demande « combien » : donnez à chaque candidat de 0 à 5 étoiles, comme pour noter un restaurant. Le plus gros total l’emporte. Chaque groupe donne 5 étoiles à son favori, puis 4, 3, 1 et 0. Camille récolte le plus d’étoiles, 101 contre 97 pour Bruno, comme au décompte de Borda.',
    star: 'Le <strong>vote STAR</strong> (de l’anglais <em>Score Then Automatic Runoff</em> : des notes, puis un second tour automatique) ajoute une étape : les deux meilleurs totaux vont au second tour, et chaque bulletin compte pour le finaliste auquel il a donné le plus d’étoiles. Bruno est mieux noté que Camille sur 19 bulletins sur 30 : avec STAR, c’est Bruno qui l’emporte.',
    exaggerate:
      'Les étoiles incitent à exagérer. Pourquoi donner 4 étoiles à votre deuxième choix si c’est lui la menace ? Le groupe d’Ana préférerait Daniel à Bruno.',
    challenge:
      'Modifiez les étoiles d’Ana (cliquez sur une étoile ; cliquez à nouveau pour en retirer une) pour offrir au groupe d’Ana un maire qu’il préfère à Bruno avec STAR.',
    success:
      'Avec les nouvelles étoiles d’Ana, {finalists} accèdent au second tour, et {winner} l’emporte. La version préférée de la machine : cinq étoiles pour Daniel et pour Erik, aucune pour les autres, ce qui prive Bruno (et Camille) du second tour.',
    lesson:
      'Exagérer, ne donner que 0 ou 5 étoiles, est la stratégie classique du vote par notes, et quand tout le monde s’y met, le vote par notes devient un vote par approbation. Le second tour de STAR réduit le bénéfice de l’exagération, mais, comme le montre le groupe d’Ana, il ne le supprime pas.',
    rounds: 'STAR, tour par tour',
  },

  t15: {
    intro:
      'Les mêmes 30 électeurs. Les mêmes opinions sincères, du début à la fin. Et {n} maires différents, selon la seule façon de compter les bulletins.',
    pick: 'Au départ, vous avez dit que <strong>{name}</strong> devrait être maire.',
    pickWins: '{name} l’emporte avec ces systèmes : {systems}.',
    pickNone: 'Aucun système de cette liste n’élit {name}.',
    challenge: 'Lisez le tableau : ce que chaque système demande vraiment.',
    success:
      'Chacun répond à une question sensée. Ce sont simplement des questions différentes, et avec cinq candidats et une ville divisée, des questions différentes ont des réponses différentes.',
    lesson:
      'Alors, quel maire est le bon ? Chaque système ci-dessus a un défaut, et chacun aurait pu être manipulé par quelqu’un à Riverton. Existe-t-il un système sans défaut ? En 1951, un économiste a démontré que non.',
    system: 'Système',
    mayor: 'Maire',
    asks: 'La question qu’il pose',
    rigsTitle: 'Comment on aurait pu truquer Riverton',
    rigItem: '<strong>{system}</strong> (résultat sincère : {winner}) : {rig}',
    rigItemPending: '<strong>{system}</strong> : {rig}',
    rows: {
      plurality: {
        system: 'Une croix (scrutin à un tour)',
        asks: 'Qui a le plus de premiers choix ?',
        rig: 'Le groupe de Leo vote utile pour Bruno ; le retrait d’Amira offre la victoire à Bruno.',
      },
      two_round: {
        system: 'Deux tours',
        asks: 'Des deux premiers en premiers choix, lequel une majorité préfère-t-elle ?',
        rig: 'Que quatre membres du groupe de Frank passent à Amira ou restent chez eux, et Amira perd.',
      },
      irv: {
        system: 'Vote alternatif',
        asks: 'Qui survit quand on élimine les plus faibles un par un ?',
        rig: 'Si une partie du groupe de Frank ou de Leo reste à la maison, ce groupe obtient Camille.',
      },
      borda: {
        system: 'Points de Borda',
        asks: 'Qui a la meilleure place en moyenne ?',
        rig: 'Le groupe de Margaret enterre Camille ; le parti de Bruno présente un jumeau.',
      },
      schulze: {
        system: 'Face à face (Condorcet)',
        asks: 'Qui bat tout le monde en face-à-face ?',
        rig: 'Le groupe d’Ana enterre Bruno et fabrique un cycle.',
      },
      approval: {
        system: 'Approbation',
        asks: 'Qui est accepté par le plus de monde ?',
        rig: 'Personne ne le peut, ici ; le vote exclusif se retourne contre ses auteurs.',
      },
      star: {
        system: 'STAR',
        asks: 'Des deux mieux notés, lequel est mieux noté sur le plus de bulletins ?',
        rig: 'Le groupe d’Ana exagère ses étoiles et obtient Daniel.',
      },
    },
  },

  t16: {
    intro:
      'En 1951, l’économiste Kenneth Arrow a couché sur le papier quatre vœux modestes pour tout système qui transforme les classements des électeurs en un classement pour la ville :',
    wishes: {
      ranking: '<strong>Toujours un classement.</strong> Quels que soient les bulletins, le résultat est un ordre cohérent.',
      unanimity: '<strong>Unanimité.</strong> Si chaque électeur préfère X à Y, la ville aussi.',
      independence:
        '<strong>Indépendance.</strong> Le verdict de la ville entre X et Y ne dépend que de la façon dont les électeurs classent X par rapport à Y. Autrement dit, pas de trouble-fête : à Riverton, le retrait d’Amira n’aurait pas dû changer l’ordre entre Erik et Bruno.',
      dictator: '<strong>Pas de dictateur.</strong> Aucun électeur n’impose toujours sa volonté.',
    },
    lab: 'Le labo confronte une règle à toutes les élections possibles avec trois candidats et trois électeurs, les 216, et montre un contre-exemple concret pour chaque vœu que la règle ne respecte pas.',
    challenge: 'Trouvez une règle qui exauce les quatre vœux. Essayez au moins quatre règles.',
    success: 'Votre meilleure règle jusqu’ici en exauce {best} sur 4. Personne ne fera jamais mieux.',
    lesson:
      '<strong>Le théorème d’impossibilité d’Arrow</strong> : avec trois candidats ou plus, aucune règle de vote par classement n’exauce les quatre vœux. La majorité en duel échoue sur le premier (c’est le paradoxe de Condorcet) ; la dictature exauce les trois premiers au prix du quatrième ; tout système réel enfreint l’unanimité ou l’indépendance. Arrow a reçu le prix Nobel d’économie en 1972, en partie pour ce résultat.',
  },

  t17: {
    intro:
      'Le théorème d’Arrow parle d’équité. Son jumeau parle d’honnêteté. En 1973 et 1975, Allan Gibbard et Mark Satterthwaite ont démontré qu’avec trois candidats ou plus, <strong>tout</strong> système de vote qui n’est pas une dictature (et qui peut élire n’importe qui) récompensera, dans certaines élections, quelqu’un qui ment.',
    check:
      'Vérifions à Riverton. Le serveur va essayer tous les bulletins insincères possibles, pour chaque groupe et pour chaque nombre de menteurs en son sein, avec chaque système.',
    searching: 'Essai de tous les mensonges…',
    done: 'Terminé',
    search: 'Chercher tous les mensonges payants',
    challenge:
      'Lisez la grille : un nom dans une case signifie que ce groupe pourrait obtenir ce maire, qu’il préfère, en mentant.',
    success:
      '{riggable} des {total} systèmes peuvent être truqués par quelqu’un à Riverton. Les exceptions ici : {safe}. En dictature, seul compte le bulletin du dictateur (ici, celui du groupe de Frank) : les mensonges des autres n’y changent rien.',
    lesson:
      'La version de Gibbard couvre tous les types de bulletins, coches et étoiles compris : l’approbation est sûre à Riverton, pas dans toutes les villes. Il n’existe pas de système de vote parfait, seulement des compromis entre défauts, et mieux vaut savoir quels défauts on choisit. Le <a href="/lab">labo des théorèmes</a> mesure à quelle fréquence chaque système peut être manipulé sur des milliers de villes tirées au hasard.',
    system: 'Système',
    noLie: 'Aucun mensonge payant',
    waiting: 'Lancez la recherche pour remplir la grille.',
    tip: '{n} des {total} électeurs du groupe de {name}, par {tactic}, obtient {winner} au lieu de {honest}. | {n} des {total} électeurs du groupe de {name}, par {tactic}, obtiennent {winner} au lieu de {honest}.',
  },

  t18: {
    intro: 'Vous avez vu les deux grands résultats d’impossibilité du vote :',
    arrow: '<strong>Arrow :</strong> aucun système par classement n’est parfaitement juste.',
    gibbard: '<strong>Gibbard-Satterthwaite :</strong> aucun système n’est à l’abri de la stratégie.',
    outro:
      'Cela ne veut pas dire que tous les systèmes se valent. Chacun a sa façon de dérailler, et ses ruses pour qui veut le truquer. À vous maintenant de construire votre propre ville.',
    sandbox: 'Ouvrir le bac à sable',
    rigging: 'Lire le manuel du truqueur',
    lab: 'Visiter le labo des théorèmes',
    sheet: 'Antisèche',
    system: 'Système',
    weak: 'Point faible',
    rig: 'Comment le truquer',
    rows: {
      plurality: {
        system: 'Une croix (scrutin à un tour)',
        weak: 'Élit le favori d’une minorité ; trouble-fête',
        rig: 'Présenter un sosie de votre rival ; voter utile pour le moindre mal',
      },
      two_round: {
        system: 'Deux tours',
        weak: 'Gagner des voix peut faire perdre ; rester chez soi peut payer',
        rig: 'Choisir son adversaire du second tour (push-over)',
      },
      irv: {
        system: 'Vote alternatif',
        weak: 'Écrase le candidat du consensus, pris en étau',
        rig: 'Rester chez soi, ou classer un rival en tête pour changer l’ordre des éliminations',
      },
      borda: {
        system: 'Points de Borda',
        weak: 'Mentir sur le bas du classement rapporte',
        rig: 'Enterrer le rival ; présenter des clones',
      },
      condorcet: {
        system: 'Face à face',
        weak: 'Il faut une règle pour les cycles',
        rig: 'Enterrer le vainqueur de Condorcet pour simuler un cycle',
      },
      approval: {
        system: 'Approbation',
        weak: 'Où tracer la limite',
        rig: 'Vote exclusif (qui peut se retourner contre vous)',
      },
      score: {
        system: 'Notes / STAR',
        weak: 'La nuance sincère perd face à l’exagération',
        rig: 'Ne donner que 0 ou 5 étoiles',
      },
    },
  },
}

export default messages
