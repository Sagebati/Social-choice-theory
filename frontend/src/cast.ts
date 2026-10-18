// The town of Riverton: the five candidates and five voter groups the journey
// follows from the first step to the last. The numbers match
// `scenarios::riverton` in the Rust library, whose tests check every claim the
// journey makes about them.

import type { BallotInput, ElectionInput } from './types'

export interface Candidate {
  name: string
  fullName: string
  role: string
  pitch: string
}

export interface Persona {
  name: string
  role: string
  /** How many voters in town think exactly like this persona. */
  voters: number
  /** Honest ranking, best first, as candidate indices. */
  ranking: number[]
  why: string
}

export const AMIRA = 0
export const BRUNO = 1
export const CAMILLE = 2
export const DANIEL = 3
export const ERIK = 4

export const CANDIDATES: Candidate[] = [
  { name: 'Amira', fullName: 'Amira Haddad', role: 'Green councillor', pitch: 'Bike lanes, parks and a climate plan.' },
  { name: 'Bruno', fullName: 'Bruno Costa', role: 'Deputy mayor', pitch: 'Eight years at city hall. Steady, pragmatic, a little grey.' },
  { name: 'Camille', fullName: 'Camille Laurent', role: 'Former school principal', pitch: 'Schools, childcare and affordable housing.' },
  { name: 'Daniel', fullName: 'Daniel Okafor', role: 'Transport engineer', pitch: 'Night buses now, a tram by 2030.' },
  { name: 'Erik', fullName: 'Erik Brandt', role: 'Businessman, outsider', pitch: 'Cut taxes and shake up city hall.' },
]

export const NAMES = CANDIDATES.map((c) => c.name)

// Bruno's party can field a near-copy of Bruno (the teaming trick).
export const CLONE: Candidate = {
  name: 'Gina',
  fullName: 'Gina Costa',
  role: 'Bruno’s running mate',
  pitch: 'Same party, same programme as Bruno.',
}

export const PERSONAS: Persona[] = [
  {
    name: 'Frank',
    role: 'Runs the hardware store on Main Street',
    voters: 9,
    ranking: [ERIK, BRUNO, CAMILLE, DANIEL, AMIRA],
    why: 'Taxes are strangling small shops, and Erik gets it. Bruno at least knows how city hall works. Amira wants to turn the parking outside the shop into a bike lane.',
  },
  {
    name: 'Leo',
    role: 'Bike courier',
    voters: 7,
    ranking: [AMIRA, BRUNO, CAMILLE, DANIEL, ERIK],
    why: 'Climate first. Bruno backed the first bike lanes; Erik has promised to rip them out.',
  },
  {
    name: 'Ana',
    role: 'Parent of two, part-time at the clinic',
    voters: 6,
    ranking: [CAMILLE, DANIEL, BRUNO, AMIRA, ERIK],
    why: 'The schools are overcrowded and Camille ran one. Daniel’s buses would get the kids there. Erik’s tax cuts mean bigger classes.',
  },
  {
    name: 'Fatou',
    role: 'Night-shift nurse, commutes by bus',
    voters: 5,
    ranking: [DANIEL, CAMILLE, ERIK, AMIRA, BRUNO],
    why: 'The last bus leaves before the shift ends. Bruno cut the night buses, so Bruno comes last; even Erik would be a change.',
  },
  {
    name: 'Margaret',
    role: 'Retired city clerk',
    voters: 3,
    ranking: [BRUNO, DANIEL, AMIRA, CAMILLE, ERIK],
    why: 'Forty years at city hall: Bruno knows the job. Daniel’s plans are sensible. Erik is frightening.',
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

export const ordinal = (n: number) => ['first', 'second', 'third', 'fourth', 'fifth'][n] ?? `${n + 1}th`
