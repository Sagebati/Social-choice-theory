// What each ballot does in each count: pure functions of the rankings, so the
// stage can show every ballot move while the server decides the results.

import { CANDIDATES, defaultApprovals, PERSONAS, type CastBallot } from '../cast'
import type { Outcome } from '../types'

export const LUCAS = 0
export const LEO = 1
export const ROBINSON = 4

/** The candidate a ballot counts for among those still in the race. */
export const nextChoice = (ranking: number[], active: boolean[]) => ranking.find((c) => active[c]) ?? -1

/** Whether a ballot ranks `a` above `b`. */
export const prefers = (ranking: number[], a: number, b: number) => ranking.indexOf(a) < ranking.indexOf(b)

/** Borda coins a ballot hands out: n−1 to its first choice, down to 0 for its last. */
export const bordaCoins = (ranking: number[]) => ranking.map((c, place) => ({ c, n: ranking.length - 1 - place }))

/** The candidates still in the last round of a count (the finalists of a runoff). */
export const finalists = (outcome: Outcome) =>
  outcome.rounds[outcome.rounds.length - 1].tallies.flatMap((t, c) => (t === null ? [] : [c]))

/** Candidates in the order a count knocked them out. */
export const eliminations = (outcome: Outcome) => outcome.rounds.flatMap((r) => r.eliminated)

/** A round's tallies as numbers (candidates out of the round count 0). */
export const tallies = (outcome: Outcome, round = 0) => outcome.rounds[round].tallies.map((t) => t ?? 0)

/** The best total other than the winner's, for "wins 74 to 72". */
export function runnerUp(totals: number[], winner: number) {
  const rest = totals.map((t, c) => (c === winner ? -Infinity : t))
  const c = rest.indexOf(Math.max(...rest))
  return { c, votes: totals[c] }
}

// The four elections the journey counts. Every group ticks its top two for
// approval; three stories change one group's ballot.
const withApprovals = (ranking: number[]): CastBallot => ({ ranking: [...ranking], approvals: defaultApprovals(ranking) })
export const honest = (): CastBallot[] => PERSONAS.map((p) => withApprovals(p.ranking))

/** Léo's group marks Bruno, its second choice, instead of Amira. */
export function compromise(): CastBallot[] {
  const ballots = honest()
  const r = PERSONAS[LEO].ranking
  ballots[LEO] = withApprovals([r[1], r[0], ...r.slice(2)])
  return ballots
}

/** In round one of two, Robinson's group marks Daniel, its second choice, instead of Bruno. */
export function compromiseTwoRound(): CastBallot[] {
  const ballots = honest()
  const r = PERSONAS[ROBINSON].ranking
  ballots[ROBINSON] = withApprovals([r[1], r[0], ...r.slice(2)])
  return ballots
}

/** Robinson's group moves Camille, its fourth choice, below Erik. */
export function bury(): CastBallot[] {
  const ballots = honest()
  const r = PERSONAS[ROBINSON].ranking
  ballots[ROBINSON] = withApprovals([...r.slice(0, 3), r[4], r[3]])
  return ballots
}

/** Lucas's group ticks only its favourite, Erik. */
export function bullet(): CastBallot[] {
  const ballots = honest()
  const r = PERSONAS[LUCAS].ranking
  ballots[LUCAS] = { ranking: [...r], approvals: CANDIDATES.map((_, c) => c === r[0]) }
  return ballots
}
