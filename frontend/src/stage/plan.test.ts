import { describe, expect, it } from 'vitest'
import { CANDIDATES, PERSONAS, type CastBallot } from '../cast'
import { bordaCoins, bullet, bury, compromise, honest, nextChoice, prefers, pushOver } from './plan'

// The stage moves ballots one by one from the rankings; the server decides who
// wins. These counts, done the stage's way, must land on the numbers the Rust
// library's tests assert for Riverton (crates/social-choice/src/scenarios.rs).

const n = CANDIDATES.length
const TOTAL = PERSONAS.reduce((s, p) => s + p.voters, 0)
const weight = (b: CastBallot, g: number) => b.voters ?? PERSONAS[g].voters

function count(ballots: CastBallot[], pick: (b: CastBallot) => number[]) {
  const totals = Array<number>(n).fill(0)
  ballots.forEach((b, g) => pick(b).forEach((c) => (totals[c] += weight(b, g))))
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
    if (Math.max(...totals) * 2 > TOTAL) return { order, totals }
    const live = totals.map((t, c) => (active[c] ? t : Infinity))
    const out = live.indexOf(Math.min(...live))
    active[out] = false
    order.push(out)
  }
}

const borda = (ballots: CastBallot[]) => {
  const totals = Array<number>(n).fill(0)
  ballots.forEach((b, g) => bordaCoins(b.ranking).forEach(({ c, n: k }) => (totals[c] += k * weight(b, g))))
  return totals
}

const approvals = (ballots: CastBallot[]) => count(ballots, (b) => b.approvals!.flatMap((on, c) => (on ? [c] : [])))

describe('the stage counts Riverton like the server', () => {
  it('one round, and the lesser evil', () => {
    expect(TOTAL).toBe(32)
    expect(count(honest(), (b) => [b.ranking[0]])).toEqual([7, 5, 6, 4, 10])
    const aida = count(compromise(), (b) => [b.ranking[0]])
    expect(aida).toEqual([7, 11, 0, 4, 10])
    expect(top(aida)).toBe(1)
  })

  it('two rounds, and the push-over', () => {
    expect(twoRound(honest())).toEqual({ finalists: [0, 4], runoff: [22, 0, 0, 0, 10] })
    // Round one with two of Lucas's group on Melon: Duck and Melon 8 each, Cuauhtémoc 7.
    expect(count(pushOver(), (b) => [b.ranking[0]])).toEqual([7, 5, 8, 4, 8])
    // In the runoff everyone votes their true preference again, and Duck wins.
    const runoff = count(honest(), (b) => [prefers(b.ranking, 4, 2) ? 4 : 2])
    expect(runoff).toEqual([0, 0, 11, 0, 21])
  })

  it('instant runoff knocks out Poutine, Manu, then Duck', () => {
    expect(irv(honest())).toEqual({ order: [3, 1, 4], totals: [11, 0, 21, 0, 0] })
  })

  it('Borda points, and burying Poutine', () => {
    expect(borda(honest())).toEqual([51, 82, 48, 84, 55])
    expect(borda(bury())).toEqual([56, 82, 53, 69, 60])
  })

  it('approval, and the bullet vote that backfires', () => {
    expect(approvals(honest())).toEqual([11, 21, 6, 16, 10])
    expect(approvals(bullet())).toEqual([11, 11, 6, 16, 10])
  })

  it('head to head: Manu beats everyone; Melon, Cuauhtémoc and Duck go round in a circle', () => {
    const beats = (a: number, b: number) => count(honest(), (bal) => (prefers(bal.ranking, a, b) ? [a] : [b]))[a] * 2 > TOTAL
    expect([0, 2, 3, 4].every((c) => beats(1, c))).toBe(true)
    expect([beats(2, 0), beats(0, 4), beats(4, 2)]).toEqual([true, true, true])
  })
})
