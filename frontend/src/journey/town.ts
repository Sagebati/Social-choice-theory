// Helpers shared by the journey's steps.

import { betterOff, PERSONAS, type CastBallot } from '../cast'

/** Groups whose ballot differs from their honest one. */
export function changedGroups(ballots: CastBallot[]): number[] {
  return ballots
    .map((b, g) => ({ b, g }))
    .filter(({ b, g }) => g < PERSONAS.length && (b.ranking.join() !== PERSONAS[g].ranking.join() || !!b.approvals || !!b.scores))
    .map(({ g }) => g)
}

/** Groups with some members staying home. */
export function absentGroups(ballots: CastBallot[]): number[] {
  return ballots.map((b, g) => ({ b, g })).filter(({ b, g }) => g < PERSONAS.length && b.voters !== undefined && b.voters < PERSONAS[g].voters).map(({ g }) => g)
}

/** For each group that changed its ballot (or stayed home), whether it did better than `honest`. */
export function verdicts(ballots: CastBallot[], honest: number, now: number | null): ('better' | 'worse' | 'same' | null)[] {
  const touched = new Set([...changedGroups(ballots), ...absentGroups(ballots)])
  return PERSONAS.map((_, g) => {
    if (!touched.has(g) || now === null) return null
    if (now === honest) return 'same'
    return betterOff(g, honest, now) ? 'better' : 'worse'
  })
}
