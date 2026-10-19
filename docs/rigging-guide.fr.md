# Comment truquer une élection

*Le compagnon écrit du parcours interactif ([English version](rigging-guide.md)).
Chaque exemple ci-dessous est l’un des scénarios de la bibliothèque
(`crates/social-choice/src/scenarios.rs`), et ses tests vérifient chaque
affirmation.*

Nul besoin de bourrer les urnes. Chaque mode de scrutin a ses angles morts, et
qui les connaît peut en tirer avantage. Il y a quatre leviers :

1. **La règle de décompte** : quelle méthode est utilisée.
2. **Le menu** : qui figure sur le bulletin (trouble-fête, clones).
3. **Les bulletins** : la façon dont les électeurs les remplissent (vote stratégique).
4. **L’ordre** : la séquence dans laquelle les décisions sont prises (contrôle de l’ordre du jour).

Ce guide porte sur ce que le mode de scrutin lui-même permet. Le découpage des
circonscriptions, la participation et la désinformation sont une autre histoire.

## Trois idées indispensables

### Le vainqueur de Condorcet

Comparez les candidats deux à deux. Si un candidat bat chacun de ses rivaux dans
ces face-à-face à la majorité, c’est le **vainqueur de Condorcet**, du nom du
marquis de Condorcet, qui proposa ce test en 1785. Quel que soit l’élu, s’il
n’est pas celui-là, une majorité d’électeurs lui aurait préféré le vainqueur de
Condorcet.

| | Ada | Bea | Cal |
| --- | --- | --- | --- |
| 40 électeurs | 1er | 2e | 3e |
| 35 électeurs | 3e | 1er | 2e |
| 25 électeurs | 3e | 2e | 1er |

Ici, Bea bat Ada 60 à 40 et Cal 75 à 25 : Bea est le vainqueur de Condorcet. Et
pourtant le scrutin à un tour élit Ada, avec 40 premiers choix. Les méthodes qui
élisent toujours le vainqueur de Condorcet quand il existe s’appellent des
**méthodes de Condorcet** (Copeland, minimax, Schulze, paires classées, vote
séquentiel). Le scrutin à un tour, le scrutin à deux tours, le vote alternatif,
la méthode Borda, le vote par approbation, le vote par notes et STAR peuvent
tous le manquer.

Il peut aussi n’y avoir aucun vainqueur de Condorcet. Avec 4 électeurs qui
classent Ada > Bea > Cal, 3 qui classent Bea > Cal > Ada et 2 qui classent
Cal > Ada > Bea, une majorité préfère Ada à Bea (6 à 3), Bea à Cal (7 à 2) et
Cal à Ada (5 à 4). C’est le **paradoxe de Condorcet** : des électeurs
raisonnables chacun de leur côté, qui collectivement tournent en rond. Toute
méthode doit briser ces cycles d’une façon ou d’une autre, et c’est là que
travaillent ceux qui fixent l’ordre du jour et ceux qui enterrent leurs rivaux.

### Le théorème d’impossibilité d’Arrow

Kenneth Arrow (1951) a cherché une règle qui transforme n’importe quel ensemble
de classements individuels en un classement pour la société, et qui respecte
quatre conditions modestes :

1. **Toujours un classement** : quels que soient les bulletins, le résultat est complet et transitif.
2. **Unanimité (Pareto)** : si tous les électeurs préfèrent X à Y, la société aussi.
3. **Indépendance des options non pertinentes** : la façon dont la société classe
   X face à Y ne dépend que de la façon dont les électeurs classent X face à Y.
   Ajouter ou retirer un troisième candidat ne peut pas l’inverser : pas de
   trouble-fête.
4. **Absence de dictateur** : aucun électeur dont la société recopie toujours les préférences strictes.

Dès qu’il y a trois candidats ou plus, **aucune règle ne respecte les quatre**.
La majorité en duel respecte les conditions 2 à 4 mais pas la 1 (le paradoxe de
Condorcet). La dictature respecte les conditions 1 à 3. Toute méthode réelle
viole l’unanimité ou l’indépendance. Le labo des théorèmes le vérifie par force
brute : avec 3 candidats et 3 électeurs, il n’y a que 6³ = 216 profils, et
`arrow::check_arrow` les essaie tous.

Le vote par approbation et le vote par notes sortent du cadre du théorème en
demandant plus qu’un classement, mais cela ne les protège pas de la stratégie.

### Le théorème de Gibbard-Satterthwaite

Allan Gibbard (1973) et Mark Satterthwaite (1975) ont démontré qu’avec trois
candidats ou plus, toute méthode qui peut élire n’importe quel candidat et qui
n’est pas une dictature récompense parfois un électeur qui ment. La version de
Gibbard couvre tous les types de bulletins. On ne peut pas concevoir une méthode
qui empêche la triche ; on peut seulement la rendre plus rare, plus risquée ou
plus difficile à calculer. `manipulation::manipulability` mesure, pour chaque
méthode, la part d’élections tirées au hasard qui peuvent être manipulées.

## Les tactiques

| Tactique | Ce que fait le menteur | Où elle frappe |
| --- | --- | --- |
| **Vote utile** | Place un moindre mal au-dessus de son vrai favori | Scrutin à un tour, scrutins à second tour ; le moteur du bipartisme |
| **Enterrement** | Classe un rival dangereux sous des candidats qu’il juge pourtant pires | Borda, Coombs, et c’est la seule façon d’attaquer les méthodes de Condorcet |
| **Push-over** | Soutient un candidat dont il ne veut pas, pour choisir l’adversaire de son favori ou changer qui est éliminé | Méthodes non monotones : deux tours, vote alternatif, Coombs |
| **Vote exclusif** | Ne soutient que son favori | Approbation, notes |
| **Exagération** | N’utilise que le haut et le bas de l’échelle de notes | Notes, STAR |
| **Trouble-fête et clones** | Change le menu : un sosie divise les voix d’un rival, ou une équipe de clones ramasse des points | Un tour (division), Borda (équipe), STAR |
| **Contrôle de l’ordre du jour** | Choisit l’ordre des duels | Vote séquentiel, dès qu’il y a un cycle |
| **Abstention stratégique** | Reste chez soi, parce que voter ferait élire pire | Méthodes qui violent la participation : scrutins à second tour, méthodes de Condorcet à partir de 4 candidats, STAR |

## Méthode par méthode

### Scrutin à un tour

*Une croix sur un nom ; le plus de croix l’emporte.* Utilisé pour les élections
législatives au Royaume-Uni, aux États-Unis, au Canada et en Inde.

* **Présenter un trouble-fête.** Dans le tableau ci-dessus, Ada ne gagne que
  parce que Bea et Cal se partagent les 60 % restants. Retirez Cal, et Bea
  gagne. Financez un sosie de votre rival et vous pouvez l’emporter avec une
  minorité. En Floride, en 2000, Bush avait 537 voix d’avance tandis que Nader,
  dont les électeurs préféraient pour la plupart Gore, en recueillait plus de
  97 000.
* **Miser sur le vote utile.** Si 6 des 25 électeurs de Cal passent à Bea, Bea
  gagne 41 à 40. Qui façonne l’idée de qui est « crédible » façonne la course.
* **Gagner alors que la plupart vous classent dernier.** Le scrutin à un tour
  peut élire le perdant de Condorcet.
* **La loi de Duverger.** Comme voter pour un troisième parti peut aider celui
  qu’on aime le moins, les voix se concentrent sur deux grands partis.

Respecte la majorité, Pareto, la monotonie et la participation. Viole Condorcet,
le perdant de Condorcet, l’indépendance des options non pertinentes et les clones.

### Scrutin à deux tours

*Les deux candidats arrivés en tête des premiers choix s’affrontent au second
tour.* Utilisé pour l’élection présidentielle en France, au Brésil et ailleurs.

* **Choisir son adversaire (push-over).** Les partisans d’un candidat fort votent
  au premier tour pour un candidat faible, pour l’affronter au second.
* **Les diviser au premier tour.** Un champ éclaté peut écarter du second tour
  des candidats largement acceptables. En France, en 2002, la gauche s’était
  dispersée entre de nombreuses candidatures : Lionel Jospin (16,18 %) est
  arrivé derrière Jean-Marie Le Pen (16,86 %), et Jacques Chirac a été réélu au
  second tour avec 82 % des voix.
* **Plus de voix, pire résultat.** Gagner des voix au premier tour peut changer
  votre adversaire du second et vous faire perdre. La méthode n’est pas monotone.

### Vote alternatif (second tour instantané)

*On élimine le candidat qui a le moins de premiers choix, on reporte ses
bulletins, et on recommence.* Utilisé pour la Chambre des représentants
australienne, l’élection présidentielle irlandaise, dans le Maine, en Alaska et
pour les primaires de la ville de New York.

* **L’écrasement du centre.** Avec 35 Ada > Bea > Cal, 33 Cal > Bea > Ada et
  32 Bea > Ada > Cal, Bea bat Ada 65 à 35 et Cal 67 à 33 en face-à-face, mais
  c’est elle qui a le moins de premiers choix : elle est éliminée la première,
  et Ada gagne. C’est arrivé à Burlington, dans le Vermont (2009), et lors de
  l’élection partielle de 2022 à la Chambre des représentants en Alaska.
* **Gagner en perdant.** Avec 39 Ada > Bea > Cal, 35 Bea > Cal > Ada et
  26 Cal > Ada > Bea, Ada gagne. Si 10 électeurs de Bea classent plutôt Ada en
  premier, c’est Bea qui est éliminée, et Cal gagne 51 à 49. Vu du côté de ces
  10 électeurs, c’est un push-over : en classant premier Ada, leur dernier
  choix, ils ont remplacé Ada par Cal, leur deuxième.
* **Mieux vaut rester chez soi.** Avec 20 Bea > Ada > Cal, 40 Cal > Ada > Bea et
  30 Ada > Cal > Bea, Ada gagne. Si 15 électeurs Bea > Ada > Cal de plus se
  déplacent, Ada est éliminée et Cal gagne, alors que ces nouveaux venus
  préféraient Ada à Cal.

Respecte la majorité, le perdant de Condorcet et les clones. Viole Condorcet,
la monotonie, la participation et l’indépendance des options non pertinentes.

### Coombs

*On élimine le candidat classé dernier par le plus d’électeurs.* L’**enterrement**
y est dévastateur : un bloc qui classe un rival en dernier peut l’éliminer
presque à volonté.

### Méthode Borda

*n−1 points pour un premier choix, jusqu’à 0 pour le dernier.* Utilisée pour les
sièges des minorités en Slovénie, des trophées sportifs et des concours de
chansons. Jean-Charles de Borda l’a présentée à l’Académie des sciences en 1770, une
quinzaine d’années avant que Condorcet ne lui oppose son propre critère.

* **Enterrer le rival.** Sincèrement, 50 Ada > Bea > Cal et 40 Bea > Ada > Cal
  donnent 140 points à Ada contre 130 à Bea. Si 11 électeurs de Bea relèguent
  Ada en dernier, sous Cal qui n’a aucune chance, Bea gagne. Si les deux camps
  enterrent, un outsider sans appui peut l’emporter.
* **Présenter une équipe de clones.** Ada bat Bea 30 à 20 en face-à-face.
  Ajoutez Bex, une quasi-copie de Bea que tout le monde classe juste à côté de
  Bea, et Bea gagne le décompte de Borda 70 à 60.
* Borda aurait répondu à ses critiques : « Mon scrutin n’est fait que pour
  d’honnêtes gens. »

Respecte le perdant de Condorcet, la monotonie et la participation. Viole la
majorité, Condorcet, l’indépendance des options non pertinentes et les clones.

### Vote séquentiel (ordre du jour)

*Une suite de duels dans un ordre fixé ; le dernier debout l’emporte.* C’est
ainsi que bien des assemblées votent les amendements.

* **Contrôler l’ordre du jour.** Dans un cycle, celui qui entre en dernier gagne :
  la présidence choisit le vainqueur en choisissant l’ordre.
* **Élire quelqu’un que tout le monde classe plus bas.** Avec quatre candidats,
  un ordre du jour peut élire un candidat que chaque électeur classe sous un
  autre : la méthode viole l’unanimité.

### Copeland, minimax, Schulze et paires classées

Ces méthodes de Condorcet s’accordent dès qu’il existe un vainqueur de
Condorcet, et diffèrent dans leur façon de briser les cycles. Copeland compte
les victoires (les cycles deviennent des égalités), minimax élit celui dont la
pire défaite est la plus légère, Schulze suit les chaînes de victoires les plus
fortes, et les paires classées verrouillent d’abord les plus grandes majorités,
puis abandonnent le maillon le plus faible d’un cycle. Schulze est utilisée par
Debian, Gentoo, Ubuntu et de nombreux partis pirates.

* **Enterrer le vainqueur de Condorcet pour fabriquer un cycle.** Avec
  10 Ada > Bea > Cal, 10 Cal > Ada > Bea et 15 Bea > Ada > Cal, Ada est le
  vainqueur de Condorcet. Si 11 électeurs de Bea classent Ada en dernier, Cal
  bat Ada 21 à 14, le maillon le plus faible du cycle devient la victoire
  d’Ada sur Bea (20 à 15), et Schulze, les paires classées et minimax élisent
  tous Bea. Avec 8 à 10 enterreurs, le cycle existe déjà, mais Ada y survit.
  L’enterrement est un pari : si l’on se trompe dans les chiffres, ou si l’on
  est démasqué, il se retourne contre soi.
* **Rester chez soi.** À partir de quatre candidats, toutes les méthodes de
  Condorcet souffrent du paradoxe de l’abstention (Moulin, 1988).
* Avec quatre candidats, minimax peut même élire le perdant de Condorcet, et
  n’est plus indépendant des clones dès qu’une famille de trois clones forme
  elle-même un cycle.

### Vote par approbation

*On approuve autant de candidats qu’on veut ; le plus d’approbations l’emporte.*
Utilisé à Fargo, dans le Dakota du Nord, et à Saint-Louis, dans le Missouri.

* **Vote exclusif.** N’approuver que son favori, pour ne jamais aider un rival
  proche. Si les deux camps rivaux le font, le candidat apprécié de tous peut
  perdre.
* **Tracer la ligne au favori des sondages.** Les électeurs stratèges approuvent
  celui des favoris qu’ils préfèrent, et tous ceux qu’ils aiment davantage,
  personne d’autre : qui façonne les sondages façonne l’endroit où chacun trace
  la ligne.
* **Battre le favori de la majorité.** Un candidat préféré par une majorité peut
  perdre si cette majorité approuve aussi quelqu’un d’autre.

### Vote par notes et STAR

*Notes : chaque candidat reçoit une note de 0 à 5, le plus haut total
l’emporte. STAR : les deux meilleurs totaux vont à un second tour automatique,
où chaque bulletin compte pour le finaliste qu’il a le mieux noté.*

* **Exagérer.** Donner 5 au favori qu’on préfère et 0 à tous les autres. Les
  électeurs sincères qui utilisent toute l’échelle pèsent moins ; quand tout le
  monde exagère, le vote par notes devient un vote par approbation.
* **STAR limite la récompense.** Donner la même note aux deux finalistes, c’est
  ne pas compter au second tour.
* **Faire équipe sous STAR.** Deux candidats semblables peuvent atteindre
  ensemble le second tour et en évincer un troisième apprécié de tous.
* **Des notes grossières.** Quand des électeurs donnent la même note à des
  candidats qu’ils n’apprécient pas autant, le second tour de STAR peut même
  élire le candidat qui perd tous ses face-à-face.

### Dictature

*Le premier bulletin décide.* Personne d’autre que le dictateur ne peut la
manipuler avec son propre bulletin, et c’est précisément pourquoi elle échappe à
Gibbard-Satterthwaite. Pour la truquer, devenez le dictateur.

## Quelle méthode respecte quel critère

✓ toujours respecté, ✗ peut être violé (le labo des théorèmes montre un contre-exemple pour chaque ✗).

| Méthode | Majorité | Vainqueur de Condorcet | Perdant de Condorcet | Unanimité | Monotonie | Participation | Options non pertinentes | Clones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scrutin à un tour | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Vote par veto | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Scrutin à deux tours | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Vote alternatif | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Coombs | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Borda | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Vote séquentiel | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Copeland | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Minimax | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Schulze | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Paires classées | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Approbation | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notes | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| STAR | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Dictature | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |

Les critères sont jugés sur les classements complets des électeurs, les
bulletins sincères d’approbation et de notes en étant déduits. L’approbation et
les notes « respectent » l’indépendance des options non pertinentes et des
clones parce que, à bulletins inchangés, retirer ou ajouter un candidat ne
modifie les approbations ni les notes de personne d’autre.
