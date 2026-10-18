import type source from '../en/cast'

const cast: typeof source = {
  candidates: {
    amira: { role: 'Conseillère municipale écologiste', pitch: 'Pistes cyclables, parcs et plan climat.' },
    bruno: { role: 'Premier adjoint au maire', pitch: 'Huit ans à la mairie. Solide, pragmatique, un peu terne.' },
    camille: { role: 'Ancienne directrice d’école', pitch: 'Écoles, crèches et logements abordables.' },
    daniel: { role: 'Ingénieur des transports', pitch: 'Des bus de nuit tout de suite, un tram d’ici 2030.' },
    erik: { role: 'Chef d’entreprise, hors du sérail', pitch: 'Baisser les impôts et secouer la mairie.' },
    gina: { role: 'Colistière de Bruno', pitch: 'Même parti, même programme que Bruno.' },
  },
  personas: {
    frank: {
      role: 'Tient la quincaillerie de la Grand-Rue',
      why: 'Les impôts étranglent les petits commerces, et Erik l’a compris. Bruno, au moins, sait comment marche la mairie. Amira veut transformer le parking devant la boutique en piste cyclable.',
    },
    leo: {
      role: 'Coursier à vélo',
      why: 'Le climat d’abord. Bruno a soutenu les premières pistes cyclables ; Erik a promis de les supprimer.',
    },
    ana: {
      role: 'Parent de deux enfants, à mi-temps à la clinique',
      why: 'Les écoles débordent, et Camille en a dirigé une. Les bus de Daniel y emmèneraient les enfants. Les baisses d’impôts d’Erik, ce sont des classes plus chargées.',
    },
    fatou: {
      role: 'Infirmière de nuit, vient en bus',
      why: 'Le dernier bus part avant la fin de la garde. Bruno a supprimé les bus de nuit, alors Bruno passe en dernier ; même Erik, ce serait du changement.',
    },
    margaret: {
      role: 'Retraitée, ancienne employée de mairie',
      why: 'Quarante ans à la mairie : Bruno connaît le métier. Les projets de Daniel sont raisonnables. Erik fait peur.',
    },
  },
}

export default cast
