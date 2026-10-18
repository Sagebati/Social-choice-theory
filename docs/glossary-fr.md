# French glossary

The terms the French version uses, so the journey, the handbook, the lab and
the API's explanations all speak the same language. Add to it when you
translate something new.

## Voice

* Address the reader as **vous**.
* French from France: *bulletin*, *scrutin*, *second tour*, *report de voix*.
* Sentence case for titles, as in English: *Le moindre mal*, not *Le Moindre Mal*.
* Use the typographic apostrophe (’) and guillemets: « comme ceci ». Type an
  ordinary space before `: ; ! ?` and inside `« »`; the front end and the API
  turn it into the right non-breaking space (narrow before `; ! ?`, normal
  before `:` and inside guillemets).
* Scores in prose read *16 à 14*; tables and tallies keep *16–14*.
* Decimal comma (*4,5*): format numbers with the locale, never by hand.

## People and gender

French grammar needs genders that the English text avoids. Prefer phrasings
that don't need one, above all in messages where a name is a parameter:

* *le groupe de Frank* (the group, not the person, is the subject),
* *{name} l’emporte*, *{name} gagne*, *{name} devient maire*, *{name} arrive en
  tête*, *{name} sort de la course* (not *est élu·e*, *est éliminé·e*).

When a fixed sentence about one person can't avoid it: Amira, Camille, Gina,
Ana, Fatou and Margaret take the feminine; Bruno, Daniel, Erik, Frank and Leo
the masculine. *Maire* and *parent* are epicene. Generic voters are
*électeurs*.

## Voting methods

| English | Français |
| --- | --- |
| Plurality (one mark) | Scrutin à un tour (une seule croix) |
| Anti-plurality | Vote par veto |
| Two-round runoff | Scrutin à deux tours |
| Instant runoff (IRV) | Vote alternatif (second tour instantané) |
| Coombs | Méthode de Coombs |
| Borda count | Méthode de Borda |
| Agenda | Vote séquentiel (ordre du jour) |
| Copeland | Méthode de Copeland |
| Minimax | Minimax |
| Schulze | Méthode de Schulze |
| Ranked pairs | Paires classées (Tideman) |
| Approval | Vote par approbation |
| Score | Vote par notes |
| STAR | STAR (notes, puis second tour automatique) |
| Dictatorship | Dictature |

## Counting

| English | Français |
| --- | --- |
| ballot | bulletin |
| ranked ballot, ranking | bulletin classé, classement |
| voter | électeur (pl. électeurs) |
| candidate | candidat, candidate |
| mayor | maire |
| round, first round, runoff | tour, premier tour, second tour |
| finalists | finalistes |
| tally, count | décompte |
| vote transfer | report de voix |
| eliminated | éliminé (prefer *sort de la course*) |
| first choice, second choice | premier choix, deuxième choix |
| points (Borda) | points |
| tick, approve | coche, cocher, approuver |
| stars, score | étoiles, note |
| tie, tie-break | égalité, départage |
| majority | majorité (absolue : plus de la moitié) |
| head to head, duel | face-à-face, duel |
| pairwise matrix | tableau des duels |

## Theory

| English | Français |
| --- | --- |
| Condorcet winner | vainqueur de Condorcet |
| Condorcet loser | perdant de Condorcet |
| Condorcet paradox, cycle | paradoxe de Condorcet, cycle |
| Smith set | ensemble de Smith |
| criterion | critère |
| Majority (criterion) | Critère de la majorité |
| Unanimity (Pareto) | Unanimité (Pareto) |
| Monotonicity | Monotonie |
| Participation; no-show paradox | Participation ; paradoxe de l’abstention |
| Independence of irrelevant alternatives | Indépendance des options non pertinentes |
| Independence of clones | Indépendance des clones |
| Arrow’s impossibility theorem | théorème d’impossibilité d’Arrow |
| Arrow’s conditions | domaine universel, unanimité, indépendance des options non pertinentes, absence de dictateur |
| Gibbard–Satterthwaite theorem | théorème de Gibbard-Satterthwaite |
| strategy-proof | non manipulable |
| sincere / honest ballot | bulletin sincère |
| spatial model, opinion map | modèle spatial, carte des opinions |
| Yee diagram | diagramme de Yee |

## Rigging

| English | Français |
| --- | --- |
| to rig, to game | truquer, manipuler, déjouer |
| tactical voting | vote stratégique |
| Compromising (lesser evil) | Vote utile (le moindre mal) |
| Burying | Enterrement |
| Compromising + burying | Vote utile + enterrement |
| Push-over | Push-over (pousser un adversaire facile) |
| Bullet voting | Vote exclusif |
| Exaggeration | Exagération |
| Spoiler | trouble-fête (candidat trouble-fête) |
| Clones, teaming | clones, faire équipe |
| Agenda control | contrôle de l’ordre du jour |
| Strategic abstention | abstention stratégique |

## The site

| English | Français |
| --- | --- |
| Who Really Won? | Qui a vraiment gagné ? |
| Journey | Parcours |
| Sandbox | Bac à sable |
| Rigging handbook | Manuel du truqueur |
| Theorem lab | Labo des théorèmes |
| Step, chapter | étape, chapitre |
| Your turn | À vous de jouer |
| The lesson | La leçon |
| Make a prediction | Faites un pronostic |
| Toolbox | Boîte à outils |
| Lie finder | Détecteur de mensonges |
