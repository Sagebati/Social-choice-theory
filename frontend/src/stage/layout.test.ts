import { describe, expect, it } from 'vitest'
import { PERSONAS } from '../cast'
import { chooseMode, compactGroup, COMPACT_MIN, COMPACT_TEXT, GEOMETRY, type Box } from './layout'

// The deck's room (CSS pixels, below the site's header, inside the gutters) picks the layout.
describe('chooseMode', () => {
  it('keeps the wide picture on a desktop', () => {
    expect(chooseMode(1408, 844)).toBe('wide')
    expect(chooseMode(1248, 664)).toBe('wide')
  })

  it('draws the compact stage on phones and small tablets', () => {
    expect(chooseMode(343, 700)).toBe('portrait')
    expect(chooseMode(780, 319)).toBe('landscape')
    expect(chooseMode(736, 920)).toBe('portrait')
    expect(chooseMode(992, 712)).toBe('landscape')
  })
})

const inside = (p: { x: number; y: number }, b: Box, margin = 0) =>
  p.x >= b.x + margin && p.x <= b.x + b.w - margin && p.y >= b.y + margin && p.y <= b.y + b.h - margin

it("keeps the compact stage's smallest words at 12px or more", () => {
  expect(COMPACT_TEXT * COMPACT_MIN).toBeGreaterThanOrEqual(12)
})

describe.each(['portrait', 'landscape'] as const)('the %s stage', (mode) => {
  const g = GEOMETRY[mode]

  it('fits a 375 × 812 phone at its smallest scale, upright or sideways', () => {
    // Inside 16px gutters, or beside a notch sideways (718px wide).
    expect(g.w * COMPACT_MIN).toBeLessThanOrEqual(mode === 'portrait' ? 343 : 718)
  })

  it('fits the board and the crowd in the picture, apart', () => {
    for (const b of [g.board, g.crowd]) {
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.y).toBeGreaterThanOrEqual(0)
      expect(b.x + b.w).toBeLessThanOrEqual(g.w)
      expect(b.y + b.h).toBeLessThanOrEqual(g.h)
    }
    const apart = g.board.x + g.board.w <= g.crowd.x || g.board.y + g.board.h <= g.crowd.y
    expect(apart).toBe(true)
  })

  it('keeps every voter in the crowd, heads apart', () => {
    PERSONAS.forEach((_, gi) => {
      const { homes } = compactGroup(g, gi)
      homes.forEach((h, k) => expect(inside(h, g.crowd, k ? g.head.voter : g.head.spoke)).toBe(true))
      for (let i = 0; i < homes.length; i++)
        for (let j = i + 1; j < homes.length; j++) {
          const reach = (i ? g.head.voter : g.head.spoke) + g.head.voter
          expect(Math.hypot(homes[i].x - homes[j].x, homes[i].y - homes[j].y)).toBeGreaterThan(reach)
        }
    })
  })

  it('leaves 44px targets round the tokens without overlap, at its smallest scale', () => {
    const hit = 2 * (g.token.r + 9)
    expect(hit * COMPACT_MIN).toBeGreaterThanOrEqual(44)
    g.colx.slice(1).forEach((x, c) => expect(x - g.colx[c]).toBeGreaterThanOrEqual(hit))
    expect(g.colx[0] - hit / 2).toBeGreaterThanOrEqual(g.board.x)
    expect(g.colx[g.colx.length - 1] + g.item.w / 2).toBeLessThanOrEqual(g.board.x + g.board.w)
  })

  it('keeps the tallest pile and its crown on the board', () => {
    // Approval: Manu's 21 ticks and the reader's own.
    const top = g.base - g.step * 22 - 34 - 12
    expect(top).toBeGreaterThanOrEqual(g.board.y)
  })

  it('lists the candidates and the spokespeople in rows inside the picture', () => {
    expect(g.rows).toHaveLength(PERSONAS.length)
    g.rows.forEach((r) => {
      // A face or token, a name, and a role on up to two lines.
      expect(r.h).toBeGreaterThanOrEqual(72)
      expect(r.y + r.h).toBeLessThanOrEqual(g.h)
      expect(r.x + r.w).toBeLessThanOrEqual(g.w)
    })
  })
})
