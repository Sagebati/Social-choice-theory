// What each ballot does in each count: pure functions of the rankings, so the
// stage can show every ballot move while the server decides the results.

import { CANDIDATES, defaultApprovals, MELON, PERSONAS, type CastBallot } from '../cast'
import type { Outcome } from '../types'

export const LUCAS = 0
export const AIDA = 2
export const ROBINSON = 4

/** The push-over: two of Lucas's group mark Melon in round one, to face her in the runoff. */
export const PUSH = { group: LUCAS, voters: 2, mark: MELON }

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

// The elections the journey counts. Every group ticks its top two for approval;
// each story changes one group's ballot, or part of a group's.
const withApprovals = (ranking: number[]): CastBallot => ({ ranking: [...ranking], approvals: defaultApprovals(ranking) })
export const honest = (): CastBallot[] => PERSONAS.map((p) => withApprovals(p.ranking))

/** Aïda's group marks Manu, its second choice, instead of Melon. */
export function compromise(): CastBallot[] {
  const ballots = honest()
  const r = PERSONAS[AIDA].ranking
  ballots[AIDA] = withApprovals([r[1], r[0], ...r.slice(2)])
  return ballots
}

/**
 * Round one of the push-over: two of Lucas's group mark Melon, the rest Duck.
 * Only round one is counted this way: in the runoff the two vote Duck again.
 */
export function pushOver(): CastBallot[] {
  const ballots = honest()
  const r = PERSONAS[PUSH.group].ranking
  ballots[PUSH.group] = { ...ballots[PUSH.group], voters: PERSONAS[PUSH.group].voters - PUSH.voters }
  ballots.push({ ...withApprovals([PUSH.mark, ...r.filter((c) => c !== PUSH.mark)]), voters: PUSH.voters })
  return ballots
}

/** Robinson's group moves Poutine, its second choice, to last. */
export function bury(): CastBallot[] {
  const ballots = honest()
  const r = PERSONAS[ROBINSON].ranking
  ballots[ROBINSON] = withApprovals([r[0], ...r.slice(2), r[1]])
  return ballots
}

/** Lucas's group ticks only its favourite, Duck. */
export function bullet(): CastBallot[] {
  const ballots = honest()
  const r = PERSONAS[LUCAS].ranking
  ballots[LUCAS] = { ranking: [...r], approvals: CANDIDATES.map((_, c) => c === r[0]) }
  return ballots
}
