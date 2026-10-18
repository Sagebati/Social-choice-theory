import { describe, expect, it } from 'vitest'
import { activeChoice, describeBallot, eliminatedBefore, reorder, simplifyFor } from './election'
import type { Election, Outcome } from './types'

const names = ['Ada', 'Bea', 'Cal']

describe('ballot helpers', () => {
  it('describes a ballot the way each method reads it', () => {
    const b = { weight: 1, ranking: [2, 0, 1], approvals: [true, false, true], scores: [3, 0, 5] }
    expect(describeBallot(names, b, 'choose_one')).toBe('votes Cal')
    expect(describeBallot(names, b, 'veto')).toBe('vetoes Bea')
    expect(describeBallot(names, b, 'ranked')).toBe('Cal > Ada > Bea')
    expect(describeBallot(names, b, 'approval')).toBe('approves Cal, Ada')
    expect(describeBallot(names, b, 'score')).toBe('Cal 5 · Ada 3 · Bea 0')
  })

  it('reorders candidates for an agenda without changing anyone’s preferences', () => {
    const e = { candidates: names, ballots: [{ weight: 2, ranking: [0, 1, 2] }] }
    const r = reorder(e, [2, 0, 1])
    expect(r.candidates).toEqual(['Cal', 'Ada', 'Bea'])
    // Still Ada > Bea > Cal, now written with the new indices.
    expect(r.ballots[0].ranking.map((c) => r.candidates[c])).toEqual(['Ada', 'Bea', 'Cal'])
  })

  it('merges ballots that a method cannot tell apart', () => {
    const e: Election = {
      candidates: names,
      max_score: 5,
      ballots: [
        { weight: 3, ranking: [0, 1, 2], approvals: [true, false, false], scores: [5, 3, 0] },
        { weight: 2, ranking: [0, 2, 1], approvals: [true, false, false], scores: [5, 1, 0] },
      ],
    }
    expect(simplifyFor('choose_one', e).ballots).toEqual([{ weight: 5, ranking: [0, 1, 2] }])
    expect(simplifyFor('approval', e).ballots).toHaveLength(1)
    expect(simplifyFor('ranked', e).ballots).toHaveLength(2)
    expect(simplifyFor('score', e).ballots).toHaveLength(2)
  })

  it('follows a ballot through runoff eliminations', () => {
    const outcome = {
      rounds: [
        { title: 'Round 1', tallies: [], eliminated: [2], notes: [] },
        { title: 'Round 2', tallies: [], eliminated: [1], notes: [] },
      ],
    } as unknown as Outcome
    expect([...eliminatedBefore(outcome, 0)]).toEqual([])
    expect([...eliminatedBefore(outcome, 2)]).toEqual([2, 1])
    expect(activeChoice([2, 1, 0], eliminatedBefore(outcome, 1))).toBe(1)
    expect(activeChoice([2, 1, 0], eliminatedBefore(outcome, 2))).toBe(0)
  })
})
