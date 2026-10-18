import { describe, expect, it } from 'vitest'
import { CANDIDATES, PERSONAS, type CastBallot } from '../cast'
import { bordaCoins, bullet, bury, compromise, compromiseTwoRound, honest, nextChoice, prefers } from './plan'

// The stage moves ballots one by one from the rankings; the server decides who
// wins. These counts, done the stage's way, must land on the numbers the Rust
// library's tests assert for Riverton (crates/social-choice/src/scenarios.rs).

const n = CANDIDATES.length
const weight = (g: number) => PERSONAS[g].voters

function count(ballots: CastBallot[], pick: (b: CastBallot) => number[]) {
  const totals = Array<number>(n).fill(0)
  ballots.forEach((b, g) => pick(b).forEach((c) => (totals[c] += weight(g))))
  return totals
}
const top = (totals: number[]) => totals.indexOf(Math.max(...totals))

function twoRound(ballots: CastBallot[]) {
  const first = count(ballots, (b) => [b.ranking[0]])
  const [a, b] = [...first.keys()].sort((x, y) => first[y] - first[x] || x - y).slice(0, 2)
  const runoff = count(ballots, (bal) => [prefers(bal.ranking, a, b) ? a : b])
  return { finalists: [a, b].sort(), runoff }
}

function irv(ballots: CastBallot[]) {
  const active = Array<boolean>(n).fill(true)
  const order: number[] = []
  for (;;) {
    const totals = count(ballots, (b) => [nextChoice(b.ranking, active)])
    if (Math.max(...totals) * 2 > 30) return { order, totals }
    const live = totals.map((t, c) => (active[c] ? t : Infinity))
    const out = live.indexOf(Math.min(...live))
    active[out] = false
    order.push(out)
  }
}

const borda = (ballots: CastBallot[]) => {
  const totals = Array<number>(n).fill(0)
  ballots.forEach((b, g) => bordaCoins(b.ranking).forEach(({ c, n: k }) => (totals[c] += k * weight(g))))
  return totals
}

const approvals = (ballots: CastBallot[]) => count(ballots, (b) => b.approvals!.flatMap((on, c) => (on ? [c] : [])))

describe('the stage counts Riverton like the server', () => {
  it('one mark, and the lesser evil', () => {
    expect(count(honest(), (b) => [b.ranking[0]])).toEqual([7, 3, 6, 5, 9])
    const leo = count(compromise(), (b) => [b.ranking[0]])
    expect(leo).toEqual([0, 10, 6, 5, 9])
    expect(top(leo)).toBe(1)
  })

  it('two rounds, and the lesser evil in round one', () => {
    expect(twoRound(honest())).toEqual({ finalists: [0, 4], runoff: [16, 0, 0, 0, 14] })
    expect(twoRound(compromiseTwoRound())).toEqual({ finalists: [3, 4], runoff: [0, 0, 0, 21, 9] })
  })

  it('instant runoff knocks out Bruno, Camille, then Amira', () => {
    expect(irv(honest())).toEqual({ order: [1, 2, 0], totals: [0, 0, 0, 21, 9] })
  })

  it('Borda points, and burying Camille', () => {
    expect(borda(honest())).toEqual([45, 72, 74, 63, 46])
    expect(borda(bury())).toEqual([45, 72, 71, 63, 49])
  })

  it('approval, and the bullet vote that backfires', () => {
    expect(approvals(honest())).toEqual([7, 19, 11, 14, 9])
    expect(approvals(bullet())).toEqual([7, 10, 11, 14, 9])
  })

  it('head to head: Bruno beats everyone, Erik loses to everyone', () => {
    const beats = (a: number, b: number) => count(honest(), (bal) => (prefers(bal.ranking, a, b) ? [a] : [b]))[a] > 15
    expect([0, 2, 3, 4].every((c) => beats(1, c))).toBe(true)
    expect([0, 1, 2, 3].every((c) => beats(c, 4))).toBe(true)
  })
})
