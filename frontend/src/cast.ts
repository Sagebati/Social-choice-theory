// The town of Riverton: the five candidates and five voter groups the journey
// follows from the first step to the last. The numbers match
// `scenarios::riverton` in the Rust library, whose tests check every claim the
// journey makes about them. What they say lives in the locale files, under
// `cast.candidates.<key>` and `cast.personas.<key>`.

import { i18n } from './i18n'
import type { BallotInput, ElectionInput } from './types'

export interface Candidate {
  key: 'amira' | 'bruno' | 'camille' | 'daniel' | 'erik' | 'gina'
  name: string
  fullName: string
}

export interface Persona {
  key: 'frank' | 'leo' | 'ana' | 'fatou' | 'margaret'
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

export const NAMES = CANDIDATES.map((c) => c.name)

// Bruno's party can field a near-copy of Bruno (the teaming trick).
export const CLONE: Candidate = { key: 'gina', name: 'Gina', fullName: 'Gina Costa' }

export const PERSONAS: Persona[] = [
  {
    key: 'frank',
    name: 'Frank',
    voters: 9,
    ranking: [ERIK, BRUNO, CAMILLE, DANIEL, AMIRA],
  },
  {
    key: 'leo',
    name: 'Leo',
    voters: 7,
    ranking: [AMIRA, BRUNO, CAMILLE, DANIEL, ERIK],
  },
  {
    key: 'ana',
    name: 'Ana',
    voters: 6,
    ranking: [CAMILLE, DANIEL, BRUNO, AMIRA, ERIK],
  },
  {
    key: 'fatou',
    name: 'Fatou',
    voters: 5,
    ranking: [DANIEL, CAMILLE, ERIK, AMIRA, BRUNO],
  },
  {
    key: 'margaret',
    name: 'Margaret',
    voters: 3,
    ranking: [BRUNO, DANIEL, AMIRA, CAMILLE, ERIK],
  },
]

export const TOTAL_VOTERS = PERSONAS.reduce((sum, p) => sum + p.voters, 0)

/** One group's ballot, possibly different from their honest ranking. */
export interface CastBallot {
  ranking: number[]
  approvals?: boolean[]
  scores?: number[]
  /** How many of the group actually vote (defaults to all of them). */
  voters?: number
}

export const honestBallots = (): CastBallot[] => PERSONAS.map((p) => ({ ranking: [...p.ranking] }))

/** Ballots built from a ranking approve the top two and score 5, 4, 3, 1, 0. */
export function defaultApprovals(ranking: number[]): boolean[] {
  return CANDIDATES.map((_, c) => ranking.indexOf(c) < 2)
}

export function defaultScores(ranking: number[]): number[] {
  const byPlace = [5, 4, 3, 1, 0]
  return CANDIDATES.map((_, c) => byPlace[ranking.indexOf(c)])
}

/**
 * The election the API counts. `ballots[i]` replaces persona i's honest ballot;
 * `extra` adds more groups (e.g. newcomers); `withdrawn` removes candidates;
 * `clone` adds Gina right after Bruno on every ballot.
 */
export function electionOf(
  ballots: CastBallot[] = honestBallots(),
  options: { withdrawn?: number[]; clone?: boolean; extra?: CastBallot[] } = {},
): { election: ElectionInput; candidates: number[] } {
  const withdrawn = options.withdrawn ?? []
  const all = [...ballots, ...(options.extra ?? [])]
  // Candidate indices kept, in order; Gina (index 5) comes last when present.
  const kept = [...CANDIDATES.keys()].filter((c) => !withdrawn.includes(c))
  if (options.clone) kept.push(5)
  const index = new Map(kept.map((c, i) => [c, i]))
  const names = kept.map((c) => (c === 5 ? CLONE.name : CANDIDATES[c].name))
  const result: BallotInput[] = []
  all.forEach((b, g) => {
    const weight = b.voters ?? PERSONAS[g]?.voters ?? 0
    if (weight <= 0) return
    let ranking = b.ranking.filter((c) => !withdrawn.includes(c))
    if (options.clone) ranking = ranking.flatMap((c) => (c === BRUNO ? [BRUNO, 5] : [c]))
    const ballot: BallotInput = { weight, ranking: ranking.map((c) => index.get(c)!) }
    if (b.approvals) ballot.approvals = kept.map((c) => (c === 5 ? b.approvals![BRUNO] : b.approvals![c]))
    if (b.scores) ballot.scores = kept.map((c) => (c === 5 ? b.scores![BRUNO] : b.scores![c]))
    result.push(ballot)
  })
  return { election: { candidates: names, ballots: result }, candidates: kept }
}

/** Where persona `p` honestly ranks candidate `c` (0 is their favourite). */
export const placeOf = (p: number, c: number) => PERSONAS[p].ranking.indexOf(c)

/** Is persona `p` better off with `now` than with `before`? */
export const betterOff = (p: number, before: number, now: number) => placeOf(p, now) < placeOf(p, before)

const { t } = i18n.global
export const candidateRole = (c: Candidate) => t(`cast.candidates.${c.key}.role`)
export const candidatePitch = (c: Candidate) => t(`cast.candidates.${c.key}.pitch`)
export const personaRole = (p: Persona) => t(`cast.personas.${p.key}.role`)
export const personaWhy = (p: Persona) => t(`cast.personas.${p.key}.why`)
