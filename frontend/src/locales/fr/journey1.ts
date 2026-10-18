import type source from '../en/journey1'

const messages: typeof source = {
  t01: {
    intro: 'Riverton, petite ville, cherche un nouveau maire. Cinq candidats se présentent, et {voters} personnes vont voter.',
    groups:
      'Pour que tout reste lisible, les électeurs forment cinq groupes. Dans un groupe, tout le monde classe les candidats exactement dans le même ordre ; chaque groupe a donc son porte-parole : Frank parle pour 9 électeurs, Leo pour 7, et ainsi de suite.',
    rules:
      '<strong>Personne ne change d’avis dans cette histoire.</strong> Ce qui change, étape après étape, c’est le système de vote, et parfois l’habileté avec laquelle un groupe s’en sert. Regardez qui devient maire.',
    challenge:
      'Faites connaissance avec les électeurs : ouvrez ci-dessous les raisons de chaque porte-parole ({read} sur {total}).',
    success: 'Vous connaissez Riverton, maintenant. Gardez ces cinq visages en tête.',
    lesson:
      'Tous les bulletins sincères de ce guide viennent de ces cinq classements. Quand le maire change, c’est que les règles ont changé, ou que quelqu’un a voté stratégiquement. Jamais parce que quelqu’un a changé d’avis.',
    pickEyebrow: 'Avant de compter quoi que ce soit',
    pickQuestion: 'Sachant ce que chacun veut, qui <em>devrait</em> être maire ?',
    noted: 'C’est noté : {name}. Nous reviendrons à votre choix à la fin.',
  },

  t02: {
    intro:
      'Le bulletin le plus simple qui soit : <strong>une croix sur un nom</strong>. Le nom qui reçoit le plus de croix l’emporte, majorité ou pas. C’est le <strong>scrutin à un tour</strong> (uninominal majoritaire à un tour). Le Royaume-Uni, les États-Unis, le Canada et l’Inde élisent ainsi leurs députés.',
    ballot: 'Chaque groupe coche son favori. Le bulletin ne demande rien de plus.',
    question: 'Qui devient maire ?',
    wins: '{winner} l’emporte avec <strong>{votes} voix sur {total}</strong>. Ce n’est pas une majorité : la plupart des habitants de Riverton ont coché quelqu’un d’autre.',
    lastQuestion: 'Regardez les bulletins ci-dessous. Combien d’électeurs classent {winner} tout en bas ?',
    challenge: 'Répondez à la deuxième question.',
    success:
      'Les 7 de Leo, les 6 d’Ana et les 3 de Margaret : {voters} électeurs, plus de la moitié de la ville, préféreraient n’importe qui plutôt qu’Erik. Le scrutin à un tour ne leur a jamais posé la question.',
    lesson:
      'Le scrutin à un tour ne lit que la première ligne de chaque bulletin et jette le reste. Un candidat porté par une minorité fidèle peut battre toute une série de candidats que la majorité préfère.',
    count: 'Le décompte',
    hint: 'Faites un pronostic pour compter les voix.',
  },

  t03: {
    shoes:
      'Mettez-vous à la place de Leo. Son groupe adore Amira, mais Amira est à la traîne. Le deuxième choix de Leo, c’est Bruno, et son dernier choix, Erik, est en passe de gagner.',
    compromising:
      'Voteriez-vous encore pour Amira ? Voter pour un « moindre mal » plutôt que pour son favori, c’est le <strong>vote utile</strong>. Au scrutin à un tour, c’est souvent le bon calcul.',
    challenge:
      'Vous pouvez maintenant changer la croix de n’importe quel groupe : cliquez sur un nom de son bulletin. Arrêtez Erik en changeant le moins de groupes possible, et seulement d’une façon que ces groupes approuveraient.',
    success:
      'Le groupe de {groups} a voté utile, et {winner} devient maire de Riverton. | Les groupes de {groups} ont voté utile, et {winner} devient maire de Riverton.',
    otherFixMargaret: 'Les 3 voix de Margaret pour Amira auraient aussi fait l’affaire.',
    otherFixLeo: 'Les 7 voix de Leo pour Bruno auraient aussi fait l’affaire.',
    lesson:
      'Le scrutin à un tour punit la sincérité : les électeurs dont le favori est distancé ont intérêt à l’abandonner. Avec le temps, le soutien se concentre sur deux grands partis, ce que les politologues appellent la <strong>loi de Duverger</strong>, du nom du Français Maurice Duverger. Qui contrôle le récit de qui est « crédible » (sondages, médias) contrôle qui reçoit le vote utile.',
    eyebrow: 'Décompte en direct',
    deadHeat: 'Égalité parfaite : un départage décide.',
  },

  t04: {
    withdraw:
      'Autre expérience. Personne ne change son bulletin, mais un candidat <strong>se retire</strong> avant le vote. Chaque électeur qui l’avait coché reporte sa croix sur le nom suivant de sa liste.',
    spoiler:
      'Un candidat qui ne peut pas gagner mais décide quand même de qui gagne, c’est un <strong>trouble-fête</strong> (en anglais, un « spoiler »).',
    challenge: 'Retirez un seul candidat pour que Bruno, le deuxième choix rassurant de tant d’électeurs, devienne maire.',
    success:
      'Sans Amira, les 7 voix de Leo passent à Bruno, qui bat Erik 10 à 9. Sans le vouloir, Amira était la meilleure alliée de la campagne d’Erik.',
    florida:
      'À la présidentielle américaine de 2000, George W. Bush a remporté la Floride, et avec elle la Maison-Blanche, avec 537 voix d’avance. Ralph Nader, dont les électeurs préféraient pour la plupart Al Gore à Bush, y avait recueilli plus de 97 000 voix.',
    lesson:
      'Dans cette élection, {n} candidat est un trouble-fête : {list}. Vous voulez battre un rival au scrutin à un tour ? Aidez quelqu’un qui lui ressemble à se présenter. | Dans cette élection, {n} candidats sont des trouble-fêtes : {list}. Vous voulez battre un rival au scrutin à un tour ? Aidez quelqu’un qui lui ressemble à se présenter.',
    spoilerItem: 'sans {spoiler}, {winner} l’emporterait',
    separator: ' ; ',
    eyebrow: 'Décompte en direct',
  },

  t05: {
    intro:
      'Vous le connaissez bien : c’est ainsi que la France élit son président, avec une parade au défaut du scrutin à un tour. Si personne n’obtient la majorité, les deux premiers se retrouvent deux semaines plus tard pour un <strong>second tour</strong>, et tout le monde revote, en choisissant entre ces deux-là seulement.',
    roundOne:
      'Le premier tour, c’est le décompte à une croix que vous connaissez déjà : Erik 9, Amira 7. Personne n’a la majorité, donc Erik et Amira vont au second tour. Chaque groupe coche maintenant celui des deux finalistes qu’il classe le plus haut.',
    question: 'Qui remporte le second tour ?',
    challenge: 'Regardez la colonne du second tour sur chaque bulletin ci-dessous, et vérifiez le décompte.',
    success: '{winner} remporte le second tour {won} à {lost}. Mêmes électeurs, deuxième système, deuxième maire.',
    lesson:
      'Un second tour ne peut jamais élire un candidat que tous les autres battent en face-à-face : Erik, qui perd tous ses duels, n’a donc aucune chance. Mais le second tour ne voit jamais que deux noms, choisis par un premier tour à une croix, avec tous ses défauts. Le 21 avril 2002, avec une gauche dispersée entre de nombreux candidats, Lionel Jospin (16,18\u00a0%) finit derrière Jean-Marie Le Pen (16,86\u00a0%) et manque le second tour, que Jacques Chirac remporte avec environ 82\u00a0% des voix.',
    hint: 'Faites un pronostic pour organiser le second tour.',
  },

  t06: {
    tabConverts: 'Piège 1 : gagner des voix',
    tabHome: 'Piège 2 : rester chez soi',
    converts:
      'La campagne d’Amira vit une semaine formidable : une partie du groupe de Frank est conquise et place désormais Amira <em>en tête</em> (puis Erik, Bruno, Camille, Daniel). Plus de voix au premier tour pour la gagnante. Qu’est-ce qui pourrait mal tourner ?',
    slider: 'Membres du groupe de Frank qui passent à Amira : <strong>{n}</strong> sur 9',
    sliderAria: 'Convertis',
    challengeConverts: 'Trouvez un nombre de convertis qui fait <strong>perdre</strong> Amira.',
    successConverts:
      'Avec 4 convertis, Erik tombe à 5 voix, sous les 6 de Camille : l’adversaire d’Amira au second tour n’est plus Erik mais Camille, qui l’emporte 16 à 14. Amira a perdu en gagnant des voix.',
    home: 'Le groupe de Frank place Amira tout en bas de son classement. Utilisez le bouton − sur la carte de Frank pour garder certains de ses membres à la maison le jour du vote.',
    challengeHome: 'Trouvez un moyen pour que des électeurs obtiennent un meilleur maire en <strong>ne votant pas</strong>.',
    successHome:
      'Avec {n} membres du groupe de Frank à la maison, Erik passe derrière Camille au premier tour, Camille bat Amira au second, et le groupe de Frank, qui classe Camille troisième et Amira dernière, gagne au change en restant chez lui.',
    lesson:
      'Le scrutin à deux tours n’est pas <strong>monotone</strong> : un surcroît de soutien peut changer votre adversaire du second tour et vous coûter l’élection. Il échoue aussi au critère de <strong>participation</strong> : rester chez soi peut payer. Et il invite au <strong>push-over</strong> : les 3 électeurs de Margaret pourraient soutenir Daniel au premier tour et offrir la mairie à Daniel, qu’ils préfèrent à Amira.',
    notice:
      '{n} membre du groupe de Frank vote maintenant Amira > Erik > Bruno > Camille > Daniel ; la carte de Frank montre les {rest} qui n’ont pas changé d’avis. | {n} membres du groupe de Frank votent maintenant Amira > Erik > Bruno > Camille > Daniel ; la carte de Frank montre les {rest} qui n’ont pas changé d’avis.',
  },

  t07: {
    intro:
      'Pourquoi faire revenir tout le monde pour un second tour ? Demandez une seule fois un <strong>classement</strong> complet, et faites tous les tours d’un coup. C’est le <strong>vote alternatif</strong>, ou second tour instantané, que les Américains appellent « ranked-choice voting ».',
    count:
      'On compte les premiers choix. Si personne n’a la majorité, le candidat qui en a le moins sort de la course, et chacun de ses bulletins passe au choix suivant de l’électeur encore en lice : c’est le report de voix. On recommence. L’Australie élit ainsi sa Chambre des représentants depuis 1918.',
    question: 'Qui sort de la course en premier ?',
    challenge:
      'Avancez dans le décompte avec <strong>Tour suivant</strong>. Sur chaque bulletin ci-dessous, le nom encadré montre où comptent en ce moment les voix du groupe.',
    success:
      'Bruno, puis Camille, puis Amira sortent de la course, et les bulletins de leurs électeurs s’empilent sur Daniel : 21 sur 30. Troisième système, troisième maire.',
    lesson:
      'Bruno sort le premier parce que presque personne ne le classe en tête, alors qu’il battrait chacun de ses rivaux en face-à-face. Le vote alternatif lit davantage le bulletin que le scrutin à un tour, mais à chaque étape il ne compte toujours que les premiers choix : un candidat apprécié de tous mais rarement en tête se fait évincer. C’est arrivé à l’élection municipale de 2009 à Burlington, dans le Vermont, et la ville a abandonné le vote alternatif l’année suivante.',
    hint: 'Faites un pronostic pour lancer le décompte.',
  },

  t08: {
    intro:
      'On pourrait croire qu’aller voter sincèrement ne peut jamais vous nuire. Avec le vote alternatif, si. Utilisez les boutons − et + des cartes pour garder des électeurs à la maison, et observez le décompte.',
    challenge:
      'Trouvez un groupe dont les membres obtiennent un meilleur maire, selon leur propre classement sincère, quand certains d’entre eux <strong>ne votent pas</strong>.',
    success:
      'Avec {stayers} à la maison, l’ordre des éliminations change et {winner} l’emporte à la place de Daniel. Ne pas voter du tout leur a mieux réussi.',
    stayers: '{n} membre du groupe de {name} | {n} membres du groupe de {name}',
    lesson:
      'C’est le <strong>paradoxe de l’abstention</strong> : le vote alternatif échoue au critère de <em>participation</em>. Deux autres pièges de la même famille : si 2 membres du groupe de Leo classaient Daniel premier, Daniel <em>perdrait</em> (face à Camille), et si 3 personnes de plus pensant comme Margaret venaient voter, elles offriraient elles aussi la ville à Camille, qu’elles aiment moins que Daniel. Les deux découlent de l’effet domino des éliminations.',
  },

  t09: {
    intro:
      'Les seconds tours font passer les bulletins d’un nom à l’autre, un nom à la fois. En 1770, le mathématicien français Jean-Charles de Borda propose de lire tout le classement d’un coup : on donne des <strong>points</strong>. Avec cinq candidats, une première place vaut 4 points, une deuxième 3, puis 2, 1 et 0. Celui qui a le plus de points l’emporte.',
    ballots: 'Les bulletins ci-dessous montrent ce que le classement de chaque groupe rapporte à chaque candidat.',
    question: 'Qui récolte le plus de points ?',
    challenge: 'Comparez le décompte avec les bulletins.',
    success:
      'Camille n’est le dernier choix de personne, figure dans le trio de tête de tous sauf de Margaret, et devance Bruno de justesse, 74 à 72. Quatrième système, quatrième maire.',
    lesson:
      'Borda récompense les candidats que beaucoup trouvent acceptables, même si peu les adorent. Remarquez que Bruno, qui bat chacun de ses rivaux en face-à-face, n’arrive que deuxième : points et duels ne sont pas d’accord.',
    eyebrow: 'Points de Borda',
    hint: 'Faites un pronostic pour additionner les points.',
  },
}

export default messages
