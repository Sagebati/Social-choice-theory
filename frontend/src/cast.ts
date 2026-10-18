// The town of Riverton: the five candidates and five voter groups the journey
// follows from the first step to the last. The numbers match
// `scenarios::riverton` in the Rust library, whose tests check every claim the
// journey makes about them. What they say lives in the locale files, under
// `cast.candidates.<key>` and `cast.personas.<key>`.

import { i18n } from './i18n'
import type { BallotInput, ElectionInput } from './types'

export interface Candidate {
  key: 'amira' | 'bruno' | 'camille' | 'daniel' | 'erik'
  name: string
  fullName: string
}

export interface Persona {
  key: 'lucas' | 'leo' | 'aida' | 'clelia' | 'robinson'
  name: string
  /** How many voters in town think exactly like this persona. */
  voters: number
  /** Honest ranking, best first, as candidate indices. */
  ranking: number[]
}

export const AMIRA = 0
export const BRUNO = 1
export const CAMILLE = 2
export const DANIEL = 3
export const ERIK = 4

export const CANDIDATES: Candidate[] = [
  { key: 'amira', name: 'Amira', fullName: 'Amira Haddad' },
  { key: 'bruno', name: 'Bruno', fullName: 'Bruno Costa' },
  { key: 'camille', name: 'Camille', fullName: 'Camille Laurent' },
  { key: 'daniel', name: 'Daniel', fullName: 'Daniel Okafor' },
  { key: 'erik', name: 'Erik', fullName: 'Erik Brandt' },
]

export const PERSONAS: Persona[] = [
  {
    key: 'lucas',
    name: 'Lucas',
    voters: 9,
    ranking: [ERIK, BRUNO, CAMILLE, DANIEL, AMIRA],
  },
  {
    key: 'leo',
    name: 'Léo',
    voters: 7,
    ranking: [AMIRA, BRUNO, CAMILLE, DANIEL, ERIK],
  },
  {
    key: 'aida',
    name: 'Aïda',
    voters: 6,
    ranking: [CAMILLE, DANIEL, BRUNO, AMIRA, ERIK],
  },
  {
    key: 'clelia',
    name: 'Clélia',
    voters: 5,
    ranking: [DANIEL, CAMILLE, ERIK, AMIRA, BRUNO],
  },
  {
    key: 'robinson',
    name: 'Robinson',
    voters: 3,
    ranking: [BRUNO, DANIEL, AMIRA, CAMILLE, ERIK],
  },
]

/** One group's ballot, possibly different from its honest ranking. */
export interface CastBallot {
  ranking: number[]
  approvals?: boolean[]
}

/** Ballots built from a ranking approve the top two. */
export function defaultApprovals(ranking: number[]): boolean[] {
  return CANDIDATES.map((_, c) => ranking.indexOf(c) < 2)
}

/** The election the API counts: `ballots[i]` is the ballot persona i's whole group casts. */
export function electionOf(ballots: CastBallot[]): ElectionInput {
  return {
    candidates: CANDIDATES.map((c) => c.name),
    ballots: ballots.map(
      (b, g): BallotInput => ({ weight: PERSONAS[g].voters, ranking: [...b.ranking], ...(b.approvals ? { approvals: [...b.approvals] } : {}) }),
    ),
  }
}

export const candidateRole = (c: Candidate) => i18n.global.t(`cast.candidates.${c.key}.role`)
