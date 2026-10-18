//! The catalogue in French. Same methods, same rigs in the same order, same
//! scenario links as the English; a test keeps the two in step.

use super::{rig, Texts};
use crate::methods::Method;

pub(super) fn texts(method: Method) -> Texts {
    match method {
        Method::Plurality => (
            "Une seule croix. Le plus de voix l’emporte.",
            "Chaque électeur choisit un seul candidat, et celui qui recueille le plus de voix gagne, même sans \
             majorité absolue. La méthode ignore tout des électeurs, sauf leur favori.",
            "Élections législatives au Royaume-Uni, aux États-Unis, au Canada et en Inde.",
            vec![
                rig(
                    "Lancer un trouble-fête",
                    "Soutenez un candidat qui ressemble à votre adversaire. Il divise les partisans de votre \
                     adversaire, et vous gagnez avec une minorité.",
                    Some("spoiler"),
                ),
                rig(
                    "Jouer sur le vote utile",
                    "Persuadez les partisans d’un troisième candidat que voter pour lui, c’est gaspiller sa voix. \
                     Ils se rabattent sur le moindre mal parmi les favoris : qui contrôle le récit de qui est \
                     « crédible » (sondages, médias) façonne la course.",
                    Some("spoiler"),
                ),
                rig(
                    "Gagner en étant le dernier choix de la majorité",
                    "Face à une opposition divisée, un candidat qu’une majorité classe tout en bas peut quand même \
                     gagner : le scrutin à un tour peut élire le perdant de Condorcet.",
                    Some("spoiler"),
                ),
                rig(
                    "Le verrou des deux partis (loi de Duverger)",
                    "Comme voter pour un troisième choix aide souvent celui qu’on aime le moins, le soutien se \
                     concentre sur deux grands partis, et les nouveaux venus ont du mal à percer.",
                    None,
                ),
            ],
        ),
        Method::AntiPlurality => (
            "Un veto chacun. Le moins de vetos l’emporte.",
            "Chaque électeur met son veto sur le candidat qu’il aime le moins, et celui qui reçoit le moins de \
             vetos gagne. Un candidat que personne ne déteste l’emporte, même si personne ne l’adore.",
            "Rare pour une élection publique ; on le croise dans de petits comités et des jeux de société.",
            vec![
                rig(
                    "Viser la menace, pas celui qu’on déteste",
                    "Mettez votre veto sur le principal rival de votre favori plutôt que sur le candidat que vous \
                     aimez vraiment le moins (enterrement).",
                    None,
                ),
                rig(
                    "Se fondre dans la masse",
                    "Un candidat terne reçoit peu de vetos. Gardez le vôtre loin des projecteurs et laissez chacun \
                     mettre son veto sur le champion des autres.",
                    None,
                ),
            ],
        ),
        Method::TwoRound => (
            "Les deux premiers en voix s’affrontent au second tour.",
            "Un candidat qui obtient la majorité absolue des premiers choix est élu d’emblée. Sinon, les deux \
             candidats arrivés en tête s’affrontent, et celui que préfèrent le plus d’électeurs l’emporte. Ici, \
             le second tour est décompté à partir des mêmes bulletins classés.",
            "Élection présidentielle en France, au Brésil et dans bien d’autres pays (en deux tours de scrutin \
             distincts).",
            vec![
                rig(
                    "Choisir son adversaire",
                    "Les partisans d’un candidat fort votent au premier tour pour un candidat faible, afin que leur \
                     favori affronte un adversaire facile au second (push-over). Cela peut se retourner contre eux.",
                    None,
                ),
                rig(
                    "Diviser le camp d’en face au premier tour",
                    "Dispersez les partisans d’un candidat largement acceptable entre plusieurs candidatures proches, \
                     pour qu’il manque le second tour. En France, en 2002, la gauche s’est présentée en ordre \
                     dispersé : Lionel Jospin a fini troisième avec 16,18 %, derrière Jean-Marie Le Pen (16,86 %), \
                     et Jacques Chirac a été réélu au second tour avec 82 % des voix.",
                    None,
                ),
                rig(
                    "Plus de voix, pire résultat",
                    "Gagner des voix au premier tour peut changer votre adversaire du second tour et vous faire \
                     perdre : la méthode n’est pas monotone.",
                    None,
                ),
            ],
        ),
        Method::Irv => (
            "Classez les candidats. On élimine le plus faible, on reporte ses voix, on recommence.",
            "Les électeurs classent les candidats. Si personne n’a la majorité absolue des premiers choix, le \
             candidat qui en a le moins est éliminé et ses bulletins passent au choix suivant de chaque électeur \
             encore en lice. On recommence jusqu’à ce qu’un candidat ait la majorité absolue.",
            "Chambre des représentants australienne, élection présidentielle irlandaise, Maine, Alaska et \
             primaires de la ville de New York.",
            vec![
                rig(
                    "Écraser le centre",
                    "Un candidat de compromis qui battrait tout le monde en duel peut être éliminé le premier, faute \
                     d’être le premier choix de beaucoup d’électeurs. Polarisez la course et le modéré disparaît \
                     (Burlington, dans le Vermont, en 2009 ; l’élection partielle de 2022 pour le siège de l’Alaska à \
                     la Chambre des représentants).",
                    Some("center_squeeze"),
                ),
                rig(
                    "Le push-over",
                    "Classez en tête un candidat sans espoir pour changer l’ordre des éliminations et sortir tôt un \
                     rival dangereux. Le revers de la médaille : mieux classer le vainqueur peut le faire perdre.",
                    Some("monotonicity"),
                ),
                rig(
                    "Rester chez soi",
                    "Il arrive qu’un groupe obtienne un résultat qu’il préfère en ne votant pas du tout : c’est le \
                     paradoxe de l’abstention.",
                    Some("no_show"),
                ),
                rig(
                    "Trahir son favori",
                    "Si votre favori est celui qu’on écrase, il vous faudra peut-être classer en tête un candidat de \
                     premier plan : la logique du moindre mal, comme au scrutin à un tour.",
                    Some("center_squeeze"),
                ),
            ],
        ),
        Method::Coombs => (
            "Comme le vote alternatif, mais on élimine le plus détesté.",
            "Si personne n’a la majorité absolue des premiers choix, on élimine le candidat classé dernier par le \
             plus grand nombre d’électeurs, et on recommence.",
            "Surtout une méthode de manuel ; quelques clubs et associations l’utilisent.",
            vec![rig(
                "Enterrer le rival",
                "L’élimination dépend des dernières places : un bloc coordonné qui classe un rival en dernier peut \
                 l’éliminer presque à volonté.",
                None,
            )],
        ),
        Method::Borda => (
            "Des points selon le rang : plus les électeurs vous classent haut, plus vous en marquez.",
            "Avec n candidats, un premier choix rapporte n−1 points, un deuxième n−2, et ainsi de suite jusqu’à 0 \
             pour le dernier. Le meilleur total l’emporte. La méthode récompense les candidats appréciés de tous, \
             même ceux que peu de gens adorent.",
            "Les sièges des minorités italienne et hongroise en Slovénie ; de nombreux trophées sportifs et \
             concours de chansons attribuent aussi des points selon le rang.",
            vec![
                rig(
                    "Enterrer le rival",
                    "Classez le principal rival de votre favori tout en bas, sous des candidats que vous jugez \
                     pourtant pires. Si les deux camps le font, un outsider sans envergure peut gagner.",
                    Some("borda_burying"),
                ),
                rig(
                    "Présenter une équipe de clones",
                    "Alignez plusieurs candidats semblables. Ensemble, ils raflent les points du haut du classement \
                     et font descendre tous leurs adversaires sur chaque bulletin (faire équipe).",
                    Some("borda_teaming"),
                ),
                rig(
                    "La défense de Borda",
                    "À qui lui objectait que sa méthode était facile à manipuler, Borda aurait répondu : « Mon \
                     scrutin n’est fait que pour d’honnêtes gens. »",
                    None,
                ),
            ],
        ),
        Method::Agenda => (
            "Une chaîne de duels dans un ordre fixé.",
            "Les deux premiers candidats s’affrontent ; le gagnant affronte le troisième, et ainsi de suite. Le \
             dernier encore debout l’emporte. C’est ainsi que beaucoup de parlements votent les amendements.",
            "Assemblées qui votent sur des amendements et des motions.",
            vec![
                rig(
                    "Maîtriser l’ordre du jour",
                    "Quand la majorité tourne en rond, le dernier candidat à entrer dans l’ordre du jour gagne. La \
                     présidence de séance choisit le vainqueur en choisissant l’ordre.",
                    Some("condorcet_paradox"),
                ),
                rig(
                    "Élire un candidat que tous classent plus bas",
                    "Avec quatre candidats, un ordre du jour habile peut élire un candidat que chaque électeur, sans \
                     exception, classe sous un autre : la méthode viole l’unanimité.",
                    None,
                ),
            ],
        ),
        Method::Copeland => (
            "Le plus de duels gagnés.",
            "On compare toutes les paires de candidats. Un candidat gagne un point pour chaque rival auquel une \
             majorité le préfère (un demi-point en cas d’égalité). Le plus de points l’emporte.",
            "Tournois sportifs où chacun affronte tout le monde, et quelques organisations privées.",
            vec![
                rig(
                    "Fabriquer un cycle",
                    "Enterrez le vainqueur de Condorcet pour créer un cycle. Les scores de Copeland se retrouvent à \
                     égalité, et c’est le départage qui décide.",
                    Some("condorcet_burying"),
                ),
                rig(
                    "Aligner des clones",
                    "Chaque clone ajoute des duels : une famille de candidats semblables peut faire bouger les \
                     comptes.",
                    None,
                ),
            ],
        ),
        Method::Minimax => (
            "La pire défaite la plus légère l’emporte.",
            "Chaque candidat est jugé sur sa plus lourde défaite en duel. Celui dont la pire défaite est la plus \
             légère gagne : un vainqueur de Condorcet, qui n’a aucune défaite, gagne donc toujours.",
            "Étudiée surtout en théorie ; facile à dépouiller à la main.",
            vec![
                rig(
                    "Enterrer le vainqueur de Condorcet",
                    "Classer le vainqueur de Condorcet bas, sans sincérité, lui inflige une défaite artificielle, et \
                     c’est peut-être tout ce qu’il faut à votre candidat.",
                    Some("condorcet_burying"),
                ),
                rig(
                    "Élire le perdant de Condorcet",
                    "Avec quatre candidats, celui qui perd contre tout le monde peut gagner si tous les autres ont \
                     chacun une lourde défaite.",
                    None,
                ),
            ],
        ),
        Method::Schulze => (
            "La plus forte chaîne de victoires en duel.",
            "X bat Y si X dispose d’une chaîne de victoires en duel menant à Y plus forte que celle qui mène de Y \
             à X, une chaîne ne valant que ce que vaut son maillon le plus faible. Il y a toujours quelqu’un qui \
             bat tout le monde de cette façon, et c’est lui qui gagne.",
            "Debian, Gentoo, Ubuntu et de nombreux partis pirates.",
            vec![
                rig(
                    "Enterrer le vainqueur de Condorcet",
                    "Classer le vainqueur de Condorcet bas, sans sincérité, peut créer un cycle que remporte votre \
                     candidat. C’est risqué : si trop d’électeurs l’enterrent, un troisième candidat peut gagner.",
                    Some("condorcet_burying"),
                ),
                rig(
                    "Rester chez soi",
                    "Avec quatre candidats ou plus, toutes les méthodes de Condorcet souffrent du paradoxe de \
                     l’abstention (Moulin, 1988).",
                    None,
                ),
            ],
        ),
        Method::RankedPairs => (
            "On verrouille d’abord les plus fortes majorités.",
            "On trie les résultats des duels, de la plus large majorité à la plus étroite. On verrouille chacun \
             d’eux, sauf s’il contredit ceux déjà verrouillés (en créant un cycle). Le candidat en tête de l’ordre \
             verrouillé l’emporte.",
            "Quelques organisations privées et associations étudiantes.",
            vec![
                rig(
                    "Enterrer le vainqueur de Condorcet",
                    "Comme avec toute méthode de Condorcet, un bloc peut tenter de fabriquer un cycle. Trouver une \
                     manipulation qui marche est NP-difficile en général : maigre consolation.",
                    Some("condorcet_burying"),
                ),
                rig(
                    "Rester chez soi",
                    "Avec quatre candidats ou plus, s’abstenir peut vous servir (le paradoxe de l’abstention de \
                     Moulin).",
                    None,
                ),
            ],
        ),
        Method::Approval => (
            "Approuvez autant de candidats que vous voulez. Le plus approuvé l’emporte.",
            "Chaque électeur approuve le nombre de candidats qu’il veut ; celui qu’approuvent le plus d’électeurs \
             gagne. Soutenir un deuxième choix ne retire jamais rien au total de votre premier choix.",
            "Élections municipales à Fargo (Dakota du Nord) et à Saint-Louis (Missouri), et de nombreuses sociétés \
             savantes.",
            vec![
                rig(
                    "Voter exclusif",
                    "N’approuvez que votre favori, pour ne jamais aider un rival proche. Si les deux camps rivaux \
                     raisonnent ainsi, le candidat apprécié de tous peut perdre (le « dilemme de Burr »).",
                    None,
                ),
                rig(
                    "Tracer la limite au favori de la course",
                    "L’électeur stratège approuve, parmi les mieux placés, celui qu’il préfère, plus tous ceux qu’il \
                     aime davantage, et personne d’autre. Qui façonne les sondages façonne l’endroit où chacun trace \
                     sa limite.",
                    None,
                ),
                rig(
                    "Battre le favori de la majorité",
                    "Un candidat préféré par une majorité peut perdre si cette majorité approuve aussi quelqu’un \
                     d’autre.",
                    None,
                ),
            ],
        ),
        Method::Score => (
            "Notez chaque candidat. Le meilleur total l’emporte.",
            "Les électeurs donnent une note à chaque candidat, ici de 0 à 5, comme on note un restaurant. Le \
             meilleur total (ou la meilleure moyenne) l’emporte.",
            "Rarement pour une élection publique ; partout dans les avis, les classements et les jurys.",
            vec![
                rig(
                    "Exagérer",
                    "Donnez la note maximale à celui des favoris que vous préférez et zéro à tous les autres. Les \
                     électeurs sincères qui utilisent toute l’échelle pèsent moins lourd que ceux qui n’en \
                     utilisent que les extrémités.",
                    None,
                ),
                rig(
                    "En faire un vote par approbation",
                    "Dès que tout le monde exagère, le vote par notes se comporte exactement comme le vote par \
                     approbation.",
                    None,
                ),
            ],
        ),
        Method::Star => (
            "Des notes, puis un second tour automatique entre les deux premiers.",
            "Les électeurs notent chaque candidat. Les deux meilleurs totaux vont au second tour, où chaque \
             bulletin compte comme une voix pour le finaliste qu’il a le mieux noté.",
            "Primaires de l’Independent Party of Oregon.",
            vec![
                rig(
                    "Exagérer, mais pas trop",
                    "Exagérer aide au tour des notes, mais donner la même note aux deux finalistes, c’est ne pas \
                     compter au second tour, ce qui limite le gain.",
                    None,
                ),
                rig(
                    "Présenter un jumeau",
                    "Deux candidats semblables peuvent atteindre ensemble le second tour et évincer un troisième \
                     apprécié de tous : la méthode n’est pas indépendante des clones.",
                    None,
                ),
                rig(
                    "Notes grossières, vainqueurs étranges",
                    "Quand des électeurs donnent la même note à des candidats qu’ils n’aiment pas autant, le second \
                     tour peut même élire le candidat qui perd tous ses duels.",
                    None,
                ),
            ],
        ),
        Method::Dictatorship => (
            "L’électeur numéro un décide.",
            "Le premier bulletin fait le résultat. Tous les autres sont ignorés.",
            "Heureusement, seulement dans les expériences de pensée (et quelques conseils d’administration).",
            vec![rig(
                "Capturer le dictateur",
                "Seul le dictateur peut manipuler la dictature avec son propre bulletin : c’est pourquoi elle \
                 échappe au théorème de Gibbard-Satterthwaite. Pour la truquer, devenez le dictateur, ou gagnez \
                 son oreille.",
                None,
            )],
        ),
    }
}
