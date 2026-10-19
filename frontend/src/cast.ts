// The town of Riverton: the five candidates and five voter groups the journey
// follows from the first step to the last. The numbers match
// `scenarios::riverton` in the Rust library, whose tests check every claim the
// journey makes about them. What they say lives in the locale files, under
// `cast.candidates.<key>` and `cast.personas.<key>`.

import { i18n } from './i18n'
import type { BallotInput, ElectionInput } from './types'

export interface Candidate {
  key: 'cuauhtemoc' | 'manu' | 'melon' | 'poutine' | 'duck'
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

export const CUAUHTEMOC = 0
export const MANU = 1
export const MELON = 2
export const POUTINE = 3
export const DUCK = 4

export const CANDIDATES: Candidate[] = [
  { key: 'cuauhtemoc', name: 'Cuauhtémoc', fullName: 'Cuauhtémoc Feusoulier' },
  { key: 'manu', name: 'Manu', fullName: 'Manu Macaroni' },
  { key: 'melon', name: 'Melon', fullName: 'Melon Meloni' },
  { key: 'poutine', name: 'Poutine', fullName: 'Poutine Light' },
  { key: 'duck', name: 'Duck', fullName: 'Duck Trompe' },
]

export const PERSONAS: Persona[] = [
  {
    key: 'lucas',
    name: 'Lucas',
    voters: 9,
    ranking: [DUCK, MANU, MELON, POUTINE, CUAUHTEMOC],
  },
  {
    key: 'leo',
    name: 'Léo',
    voters: 7,
    ranking: [CUAUHTEMOC, MANU, MELON, POUTINE, DUCK],
  },
  {
    key: 'aida',
    name: 'Aïda',
    voters: 6,
    ranking: [MELON, POUTINE, MANU, CUAUHTEMOC, DUCK],
  },
  {
    key: 'clelia',
    name: 'Clélia',
    voters: 5,
    ranking: [POUTINE, MELON, DUCK, CUAUHTEMOC, MANU],
  },
  {
    key: 'robinson',
    name: 'Robinson',
    voters: 3,
    ranking: [MANU, POUTINE, CUAUHTEMOC, MELON, DUCK],
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

/**
 * The election the API counts: `ballots[i]` is the ballot persona i's whole
 * group casts; `extra` ballots (the reader's) are counted alongside.
 */
export function electionOf(ballots: CastBallot[], extra: BallotInput[] = []): ElectionInput {
  return {
    candidates: CANDIDATES.map((c) => c.name),
    ballots: [
      ...ballots.map(
        (b, g): BallotInput => ({ weight: PERSONAS[g].voters, ranking: [...b.ranking], ...(b.approvals ? { approvals: [...b.approvals] } : {}) }),
      ),
      ...extra,
    ],
  }
}

/** One voter's approval ballot; the ranking the API also needs puts the ticked candidates first. */
export function approvalBallot(ticks: boolean[]): BallotInput {
  const ticked = CANDIDATES.map((_, c) => c).filter((c) => ticks[c])
  const rest = CANDIDATES.map((_, c) => c).filter((c) => !ticks[c])
  return { weight: 1, ranking: [...ticked, ...rest], approvals: [...ticks] }
}

export const candidateRole = (c: Candidate) => i18n.global.t(`cast.candidates.${c.key}.role`)
