// Where things stand on the town square. On a big screen the stage is one
// 1280 × 720 picture with the words and buttons laid over it ("wide"). On a
// phone that picture would come out at a third of its size, so the stage is
// drawn again at about one unit to the CSS pixel: the candidates' board above
// the crowd ("portrait") or beside it ("landscape"), with the words and buttons
// around it at their own sizes.

import { PERSONAS } from '../cast'

export type Mode = 'wide' | 'portrait' | 'landscape'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Geometry {
  mode: Mode
  compact: boolean
  w: number
  h: number
  /** The candidates' columns: piles, jars, cards. */
  board: Box
  /** Where the five groups stand. */
  crowd: Box
  /** The ground under the crowd, drawn past the picture's edges. */
  ground: Box
  /** The panels (how it works, a tactic, the lesson), in the picture's units. */
  panel: Box
  colx: number[]
  base: number
  step: number
  item: { w: number; h: number }
  token: { y: number; r: number; size: number }
  nameY: number
  /** How far every other name drops, so long names side by side don't run into each other. */
  stagger: number
  /** Under a name, where "your bet" goes; on the compact stage a badge on the token says it instead. */
  betY: number
  majority: { x1: number; x2: number; labelX: number; anchor: 'start' | 'end' }
  jar: { top: number; h: number; w: number }
  /** Voters' heads: the spokesperson's, and everyone else's. */
  head: { spoke: number; voter: number }
  /** Rows for the slides that list the candidates or the spokespeople. */
  rows: Box[]
}

/** On a big screen the wide picture is kept from this scale up; below it, words would shrink past reading. */
export const WIDE_MIN = 0.8

/** The compact stage's smallest words, in its units. */
export const COMPACT_TEXT = 13

/** The compact stage never draws below this scale, so its smallest words stay at 12px or more. */
export const COMPACT_MIN = 0.925

// What the words and buttons around a compact stage take, roughly, in CSS pixels.
const CHROME = { portrait: 230, landscape: 130 }

const WIDE: Geometry = {
  mode: 'wide',
  compact: false,
  w: 1280,
  h: 720,
  board: { x: 0, y: 0, w: 1280, h: 500 },
  crowd: { x: 50, y: 500, w: 1180, h: 180 },
  ground: { x: -2000, y: 500, w: 5280, h: 1000 },
  panel: { x: 290, y: 146, w: 700, h: Infinity },
  colx: [200, 420, 640, 860, 1080],
  base: 400,
  step: 8,
  item: { w: 52, h: 7 },
  token: { y: 432, r: 20, size: 18 },
  nameY: 474,
  stagger: 0,
  betY: 492,
  majority: { x1: 48, x2: 1232, labelX: 1232, anchor: 'end' },
  jar: { top: 210, h: 190, w: 64 },
  head: { spoke: 22, voter: 13 },
  rows: [],
}

const BOARD_W = 360
const CROWD_H = 240
/** The tallest pile: approval's 21 ticks for Manu, and the reader's own. */
const TALLEST = 23

/**
 * The board's columns, piles and jars at (x, y), for piles `step` units a
 * ballot: room over the tallest pile for its count and crown, then the tokens
 * and the names under them.
 */
function board(x: number, y: number, step: number) {
  const base = y + 46 + TALLEST * step
  const h = base - y + 78
  return {
    board: { x, y, w: BOARD_W, h },
    // The first 76 units are left for the majority's label, on two lines.
    colx: [0, 1, 2, 3, 4].map((c) => x + 100 + 60 * c),
    base,
    step,
    item: { w: 36, h: step - 1 },
    token: { y: base + 20, r: 16, size: 17 },
    nameY: base + 54,
    stagger: 18,
    betY: 0,
    majority: { x1: x + 4, x2: x + BOARD_W - 2, labelX: x + 4, anchor: 'start' as const },
    // A jar's crown sits 36 over it, the count 12.
    jar: { top: Math.max(y + 56, base - 130), h: Math.min(130, base - y - 56), w: 40 },
    head: { spoke: 12, voter: 8 },
  }
}

function rows(cols: number, w: number, h: number, top: number): Box[] {
  const per = Math.ceil(PERSONAS.length / cols)
  const colW = w / cols
  const rowH = (h - top * 2) / per
  return PERSONAS.map((_, i) => ({ x: Math.floor(i / per) * colW, y: top + (i % per) * rowH, w: colW, h: rowH }))
}

const tall = board(0, 0, 6)
// Room under the crowd's back row for approval's ticks.
const PORTRAIT_H = tall.board.h + 8 + CROWD_H + 4

const PORTRAIT: Geometry = {
  mode: 'portrait',
  compact: true,
  w: BOARD_W,
  h: PORTRAIT_H,
  ...tall,
  crowd: { x: 0, y: tall.board.h + 8, w: BOARD_W, h: CROWD_H },
  ground: { x: -2000, y: tall.board.h + 2, w: 5000, h: 3000 },
  panel: { x: 4, y: 4, w: BOARD_W - 8, h: tall.board.h + CROWD_H },
  rows: rows(1, BOARD_W, PORTRAIT_H, 6),
}

// Sideways, height is short: lower piles, and the crowd beside the board. Narrow
// enough to keep its scale beside a phone's notch.
const flat = board(0, 0, 5)
const LANDSCAPE_W = 740
// Room under the crowd's back row for approval's ticks.
const LANDSCAPE_H = Math.max(flat.board.h, CROWD_H) + 4

const LANDSCAPE: Geometry = {
  mode: 'landscape',
  compact: true,
  w: LANDSCAPE_W,
  h: LANDSCAPE_H,
  ...flat,
  crowd: { x: BOARD_W + 6, y: 0, w: LANDSCAPE_W - BOARD_W - 6, h: CROWD_H },
  ground: { x: BOARD_W + 2, y: -2000, w: 3000, h: 5000 },
  panel: { x: 4, y: 4, w: LANDSCAPE_W - 8, h: LANDSCAPE_H - 8 },
  rows: rows(2, LANDSCAPE_W, LANDSCAPE_H, 4),
}

export const GEOMETRY: Record<Mode, Geometry> = { wide: WIDE, portrait: PORTRAIT, landscape: LANDSCAPE }

/** The layout for a deck of w × h CSS pixels: the wide picture if it reads, else the compact one that draws bigger. */
export function chooseMode(w: number, h: number): Mode {
  if (Math.min(w / WIDE.w, h / WIDE.h) >= WIDE_MIN) return 'wide'
  const tall = Math.min(w / PORTRAIT.w, (h - CHROME.portrait) / PORTRAIT.h)
  const flat = Math.min(w / LANDSCAPE.w, (h - CHROME.landscape) / LANDSCAPE.h)
  return flat > tall ? 'landscape' : 'portrait'
}

/** Where each voter of a group stands in a compact crowd, the spokesperson first. */
export function compactGroup(g: Geometry, gi: number) {
  const { crowd } = g
  const bw = crowd.w / 3
  const bh = crowd.h / 2
  // Three groups in the first row, two centred in the second.
  const row = gi < 3 ? 0 : 1
  const bx = crowd.x + (row ? bw / 2 + (gi - 3) * bw : gi * bw)
  const by = crowd.y + row * bh
  const n = PERSONAS[gi].voters
  const cols = Math.ceil((n - 1) / 3)
  const pitch = 18
  const width = 2 * g.head.spoke + 6 + (cols - 1) * pitch + 2 * g.head.voter
  const left = bx + (bw - width) / 2
  const spoke = { x: left + g.head.spoke, y: by + 30 }
  const homes = [spoke]
  for (let m = 0; m < n - 1; m++) {
    homes.push({ x: spoke.x + g.head.spoke + 6 + g.head.voter + Math.floor(m / 3) * pitch, y: by + 12 + (m % 3) * pitch })
  }
  return { x: bx, w: bw, cx: bx + bw / 2, homes, labelY: by + 74, cardY: by + 82, cardPitch: 22, card: 20 }
}
