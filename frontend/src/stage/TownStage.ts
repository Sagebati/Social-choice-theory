// The journey as a full-screen town square, slide after slide. The stage
// draws Riverton's 30 voters and choreographs every count: ballots fly into
// piles, losing piles move on, coins fill jars, the crowd splits for duels.
// Who wins, and by how much, comes from the server (DeckData); which ballot
// goes where follows from the rankings (plan.ts). Every word is a message.

import { candidateRole, CANDIDATES, PERSONAS } from '../cast'
import { initial } from '../palette'
import type { Outcome } from '../types'
import { Animator, arc, back, ease, easeOut, type Point } from './engine'
import { bordaCoins, eliminations, finalists, nextChoice, prefers, runnerUp, tallies, AIDA, LUCAS, PUSH, ROBINSON } from './plan'
import { asButton, el, text, textWidth, wrap } from './svg'

type Translate = (key: string, params?: Record<string, string | number>) => string

export interface DeckData {
  honest: Record<'plurality' | 'two_round' | 'irv' | 'borda' | 'approval', Outcome>
  /** matrix[a][b]: voters who rank a above b. */
  matrix: number[][]
  condorcetWinner: number
  condorcetLoser: number
  /** Majorities that go round in a circle, each beating the next (empty if none). */
  cycle: number[]
  /** Plurality once Aïda's group marks Manu. */
  compromise: Outcome
  /** Round one of two once two of Lucas's group mark Melon (the push-over). */
  pushOver: Outcome
  /** Borda once Robinson's group puts Melon last. */
  bury: Outcome
  /** Approval once Lucas's group ticks only Duck. */
  bullet: Outcome
}

export interface StageOptions {
  t: Translate
  /** "Cuauhtémoc, Manu and Melon" in the reader's language. */
  list: (items: string[]) => string
  data: DeckData
  reducedMotion: boolean
  /** Go to slide i (0-based). */
  navigate: (slide: number) => void
  /** Leave the journey for another page of the site. */
  open: (path: string) => void
  /** What a screen reader should hear after each beat. */
  announce: (words: string) => void
  /** The slide's title, for the browser tab. */
  heading: (title: string) => void
  /** Approval with the reader's own ballot added: honestly, and once Lucas's group ticks only Duck. */
  approvalWith: (yours: boolean[]) => Promise<{ honest: Outcome; bullet: Outcome }>
}

const NAME = CANDIDATES.map((c) => c.name)
const LETTER = NAME.map((n) => initial(n, NAME))
const ON_DARK = [true, true, false, false, false]
const TOTAL = PERSONAS.reduce((n, p) => n + p.voters, 0)
const MAJORITY = Math.floor(TOTAL / 2) + 1
const COLX = [200, 420, 640, 860, 1080]
const BASE = 400
const STEP = 8
const TOKEN_Y = 432
const PERSONA_Y = 196
const JAR_H = 190
const JAR_TOP = BASE - JAR_H
const PX = JAR_H / 90
const SYSTEMS = ['plurality', 'twoRound', 'irv', 'borda', 'duels', 'approval'] as const
// What fades behind a panel (how it works, a tactic thought through, the lesson).
const DIMMED = ['machine', 'notes', 'items', 'coins', 'crownLayer', 'stamps']
// Pictures only: the words that matter are on the cards, the captions and the live region.
const SILENT = ['cards', 'crowd', 'items', 'coins', 'crownLayer']
/** With reduced motion nothing moves, so a pause between two steps is all the time there is to read. */
const READ = 1800
const DOT_GAP = 24
type System = (typeof SYSTEMS)[number]
type Kind = 'primary' | 'ghost' | ''
/** A decorative arrow either side of a button's words; screen readers hear the words alone. */
type Glyphs = { before?: string; after?: string }

interface Button {
  g: SVGGElement
  /** Redraws it with its left edge at x (or its right edge, with `right`); returns its width. */
  draw: (label: string, x: number, y: number, kind?: Kind, glyphs?: Glyphs, right?: boolean) => number
  onPress: (action: () => void) => void
  show: (on: boolean) => void
}

interface Voter {
  g: number
  k: number
  spoke: boolean
  home: Point
  r: number
  ranking: number[]
  pos: Point
  s: number
  mood: number
  node: SVGGElement
  mouth: SVGPathElement
  ballot: Item
}

interface Item {
  g: SVGGElement
  rect: SVGRectElement
  v: Voter
  x: number
  y: number
  s: number
  rot: number
}

interface Group {
  x: number
  w: number
  cx: number
  card: SVGGElement
}

// Bets survive leaving the journey and coming back, until "Start over".
const memory = {
  bets: SYSTEMS.map(() => null as boolean | null),
  known: SYSTEMS.map(() => false),
}

export class TownStage {
  static readonly SLIDES = 14

  private readonly anim: Animator
  private readonly t: Translate
  private readonly layer: Record<string, SVGGElement> = {}
  private readonly voters: Voter[] = []
  private readonly groups: Group[] = []
  private readonly spokes: Voter[] = []
  private readonly title: SVGTextElement
  private readonly caption: SVGTextElement
  private readonly crown: SVGGElement
  private crownPos: Point | null = null
  private readonly blink: number
  private readonly hiddenCards = new Set<number>()
  private betMark: { c: number; ring: SVGCircleElement; label: SVGTextElement } | null = null
  // Back, Skip (or Start over) and the slide dots stay from slide to slide, so the focus stays on them.
  private readonly back: Button
  private readonly corner: Button
  private readonly dots: SVGGElement[] = []
  /** What the screen reader has yet to hear from this beat, said in one go. */
  private heard: string[] = []
  private hearing = 0
  private gen = 0
  private current = 0
  /** Resolves the beat waiting for the reader's tap, if one is. */
  private waiting: (() => void) | null = null
  // Piles.
  private cols: { token: SVGGElement; count: SVGTextElement }[] = []
  private stacks: Item[][] = []
  private landed: number[] = []
  private active: boolean[] = []

  constructor(
    private readonly svg: SVGSVGElement,
    private readonly o: StageOptions,
  ) {
    this.anim = new Animator(o.reducedMotion)
    this.t = o.t
    svg.replaceChildren()
    const defs = el('defs', {}, svg)
    const marker = el('marker', { id: 'stage-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs)
    el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' }, marker)
    el('rect', { class: 'ground', x: -2000, y: 500, width: 5280, height: 1000 }, svg)
    const faded = new Set(['cards', 'labels', ...DIMMED])
    for (const id of ['machine', 'notes', 'cards', 'crowd', 'labels', 'items', 'coins', 'crownLayer', 'stamps', 'bubbles', 'thought', 'ui']) {
      this.layer[id] = el('g', faded.has(id) ? { class: 'fade' } : {}, svg)
    }
    SILENT.forEach((id) => this.layer[id].setAttribute('aria-hidden', 'true'))
    const ui = this.layer.ui
    // The title is where the focus waits while the controls it was on are redrawn.
    this.title = text(48, 66, '', 'title', ui, 'start')
    Object.entries({ role: 'heading', 'aria-level': 1, tabindex: -1 }).forEach(([k, v]) => this.title.setAttribute(k, String(v)))
    this.caption = text(48, 104, '', 'caption', ui, 'start')
    for (const id of ['hud', 'buttons', 'picks', 'nav']) this.layer[id] = el('g', {}, ui)
    this.layer.hud.classList.add('fade')
    this.layer.hud.setAttribute('role', 'img')
    this.back = this.makeButton(this.layer.nav)
    this.corner = this.makeButton(this.layer.nav)
    this.buildDots()
    this.buildCrowd()
    // Like a slide: a click anywhere but on a control goes on.
    svg.addEventListener('click', (e) => {
      if (!(e.target as Element).closest('.sbtn, .hit, .dot-btn')) this.advance()
    })
    this.crown = el('g', { class: 'gone fade' }, this.layer.crownLayer)
    el('path', { class: 'crown', d: CROWN }, this.crown)
    this.blink = window.setInterval(() => {
      if (this.anim.reduced) return
      const v = this.voters[Math.floor(Math.random() * this.voters.length)]
      v.node.classList.add('blink')
      window.setTimeout(() => v.node.classList.remove('blink'), 240)
    }, 650)
  }

  /** Shows slide i (0-based) from its start. */
  show(i: number) {
    const focused = this.svg.contains(document.activeElement)
    this.reset()
    this.current = Math.max(0, Math.min(TownStage.SLIDES - 1, i))
    const noHud = this.current < 3 || this.current === TownStage.SLIDES - 1
    this.layer.hud.classList.toggle('gone', noHud)
    this.layer.hud.setAttribute('aria-hidden', String(noHud))
    this.drawHud()
    this.drawNav()
    // The control the focus was on may be gone (Back, on the first slide).
    if (focused && !this.showing(document.activeElement)) this.park()
    void this.play(this.current)
  }

  set reducedMotion(on: boolean) {
    this.anim.reduced = on
  }

  /** Goes on: the beat waiting for the reader, or the next slide once this one is done. */
  advance() {
    this.waiting?.()
  }

  private async play(i: number) {
    // A slide left midway never finishes: its animations are dropped, not resolved.
    await this.slides[i]()
    if (i < TownStage.SLIDES - 1) {
      await this.tap()
      this.o.navigate(i + 1)
    }
  }

  /** Plays the current slide again, e.g. after a change of language. */
  replay() {
    this.show(this.current)
  }

  dispose() {
    this.gen++
    this.anim.cancel()
    window.clearInterval(this.blink)
    window.clearTimeout(this.hearing)
    this.svg.replaceChildren()
  }

  // ---- The crowd: five groups, each led by its spokesperson.

  private buildCrowd() {
    const pitch = 34
    const widths = PERSONAS.map((p) => 60 + Math.ceil((p.voters - 1) / 2) * pitch)
    const gap = (1180 - widths.reduce((a, b) => a + b, 0)) / (PERSONAS.length - 1)
    let x = 50
    PERSONAS.forEach((p, gi) => {
      const g: Group = { x, w: widths[gi], cx: x + widths[gi] / 2, card: el('g', {}, this.layer.cards) }
      x += widths[gi] + gap
      this.groups.push(g)
      for (let k = 0; k < p.voters; k++) {
        const spoke = k === 0
        const m = k - 1
        const home = spoke ? { x: g.x + 24, y: 596 } : { x: g.x + 64 + Math.floor(m / 2) * pitch, y: 578 + (m % 2) * 38 }
        const v = { g: gi, k, spoke, home, r: spoke ? 22 : 13, ranking: p.ranking, pos: { ...home }, s: 1, mood: 0 } as Voter
        v.node = el('g', { class: 'voter' + (spoke ? ' spoke' : '') }, this.layer.crowd)
        el('circle', { r: v.r, class: 'head' }, v.node)
        const eyes = el('g', { class: 'eyes' }, v.node)
        const ex = v.r * 0.36
        const er = Math.max(1.5, v.r * 0.11)
        el('circle', { cx: -ex, cy: -v.r * 0.12, r: er, class: 'eye' }, eyes)
        el('circle', { cx: ex, cy: -v.r * 0.12, r: er, class: 'eye' }, eyes)
        v.mouth = el('path', { class: 'mouth', d: mouthPath(v.r, 0) }, v.node)
        this.setNode(v, home.x, home.y, 1)
        v.ballot = this.makeItem(v)
        this.voters.push(v)
        if (spoke) this.spokes.push(v)
      }
      const label = el('text', { x: g.cx, y: 660, 'text-anchor': 'middle' }, this.layer.labels)
      el('tspan', { class: 'group-name' }, label).textContent = p.name
      el('tspan', { class: 'group-n', dx: 6 }, label).textContent = '×' + p.voters
      // The group's ballot stays in view: its ranking, favourite first.
      p.ranking.forEach((c, i) => {
        const cx = g.cx - 58 + i * 23
        el('rect', { x: cx, y: 510, width: 20, height: 20, rx: 4, class: 'card-sq c' + c }, g.card)
        text(cx + 10, 524, LETTER[c], 'letter tiny ' + onClass(c), g.card).style.fontSize = LETTER[c].length > 1 ? '9.5px' : ''
      })
    })
  }

  private setNode(v: Voter, x: number, y: number, s: number) {
    v.pos = { x, y }
    v.s = s
    v.node.setAttribute('transform', `translate(${x},${y}) scale(${s})`)
  }

  private move(v: Voter, to: Point, s: number, dur: number, delay: number, bob = 0) {
    const from = { ...v.pos }
    const s0 = v.s
    return this.anim.animate(dur, (t) => {
      const e = ease(t)
      const lift = t < 1 ? Math.abs(Math.sin(t * Math.PI * 3)) * bob : 0
      this.setNode(v, from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e - lift, s0 + (s - s0) * e)
    }, delay)
  }

  private setMood(v: Voter, mood: number, delay = 0) {
    const from = v.mood
    v.mood = mood
    return this.anim.animate(340, (t) => v.mouth.setAttribute('d', mouthPath(v.r, from + (mood - from) * easeOut(t))), delay)
  }

  private crowdLayout({ ballots = true, cards = true } = {}) {
    this.voters.forEach((v) => this.setNode(v, v.home.x, v.home.y, 1))
    this.layer.items.classList.toggle('gone', !ballots)
    this.layer.cards.classList.toggle('gone', !cards)
    this.layer.labels.classList.remove('gone')
  }

  private personaLayout() {
    this.voters.forEach((v) => (v.spoke ? this.setNode(v, COLX[v.g], PERSONA_Y, 1.9) : this.setNode(v, v.home.x, v.home.y, 0)))
    for (const id of ['items', 'cards', 'labels']) this.layer[id].classList.add('gone')
  }

  private emptyLayout() {
    this.voters.forEach((v) => this.setNode(v, v.home.x, v.home.y, 0))
    for (const id of ['items', 'cards', 'labels']) this.layer[id].classList.add('gone')
  }

  // ---- Ballots and ticks.

  private makeItem(v: Voter): Item {
    const g = el('g', { class: 'item' }, this.layer.items)
    const item: Item = { g, rect: el('rect', { x: -26, y: -3.5, width: 52, height: 7, rx: 2 }, g), v, x: 0, y: 0, s: 1, rot: 0 }
    this.toHand(item)
    this.paint(item, v.ranking[0])
    return item
  }

  private hand = (v: Voter) => ({ x: v.home.x + v.r * 0.95, y: v.home.y + v.r * 0.8 })
  private toHand = (item: Item) => this.place(item, this.hand(item.v), 0.36, -16)
  private paint = (item: Item, c: number) => item.rect.setAttribute('class', 'c' + c)

  private place(item: Item, p: Point, s: number, rot: number) {
    Object.assign(item, { x: p.x, y: p.y, s, rot })
    item.g.setAttribute('transform', `translate(${p.x},${p.y}) rotate(${rot}) scale(${s})`)
  }

  private fly(item: Item, to: Point, { dur = 700, delay = 0, lift = 90, recolor = -1, s1 = 1, rot1 = 0 } = {}) {
    const p0 = { x: item.x, y: item.y }
    const s0 = item.s
    const r0 = item.rot
    let swapped = false
    return this.anim.animate(dur, (t) => {
      const e = ease(t)
      this.place(item, arc(p0, to, lift, e), s0 + (s1 - s0) * e, r0 + (rot1 - r0) * e)
      if (recolor >= 0 && !swapped && t >= 0.5) {
        swapped = true
        this.paint(item, recolor)
      }
    }, delay)
  }

  // ---- Words in the scene.

  private words(title: string, caption = '') {
    this.title.textContent = title
    this.setCaption(caption, false)
    if (title) {
      this.tell(caption ? `${title}. ${caption}` : title)
      this.o.heading(title)
    }
  }

  private setCaption(caption: string, announce = true) {
    this.caption.replaceChildren()
    wrap(caption, 84).forEach((line, i) => {
      const span = el('tspan', { x: 48, dy: i ? 26 : 0 }, this.caption)
      span.textContent = line
    })
    if (announce) this.tell(caption)
  }

  /**
   * For the screen reader. What one beat says (a result, the bet, a voice, a
   * stamp) goes out together once the beat is drawn, so nothing overwrites anything.
   */
  private tell(words: string) {
    if (!words || this.heard.includes(words)) return
    this.heard.push(words)
    if (!this.hearing) {
      this.hearing = window.setTimeout(() => {
        this.hearing = 0
        this.o.announce(this.heard.splice(0).join(' '))
      })
    }
  }

  /** A pause between two steps that each say something. */
  private beat(ms: number) {
    return this.anim.reduced ? this.anim.hold(Math.max(ms, READ)) : this.anim.sleep(ms)
  }

  // ---- Focus. Controls come and go with the beats; the focus never falls out of the stage.

  /** The focus waits on the slide's title. */
  private park() {
    this.title.focus({ preventScroll: true })
  }

  /** Before the control with the focus goes away, the focus moves to the title. */
  private release(parent: Element) {
    if (parent.contains(document.activeElement)) this.park()
  }

  /** A new control for the reader: the focus moves to it if it was waiting on the title. */
  private offer(control: SVGElement) {
    if (document.activeElement === this.title) control.focus({ preventScroll: true })
  }

  private showing(e: Element | null) {
    return !!e && this.svg.contains(e) && !e.closest('[display="none"]')
  }

  private clearBubbles() {
    this.layer.bubbles.replaceChildren()
    this.hiddenCards.forEach((gi) => this.groups[gi].card.classList.remove('gone'))
    this.hiddenCards.clear()
  }

  private say(gi: number, line: string, others: { x: number; w: number }[] = []) {
    const v = this.spokes[gi]
    const w = Math.min(420, 26 + textWidth(line, 15) * 0.95)
    const h = 34
    let x = Math.max(8, Math.min(1272 - w, v.pos.x - w / 2))
    const y = v.pos.y - v.r * v.s - h - 10
    for (const o of others) {
      if (x < o.x + o.w + 8 && x + w + 8 > o.x) x = o.x + o.w + 10 <= 1272 - w ? o.x + o.w + 10 : Math.max(8, o.x - w - 10)
    }
    this.groups[gi].card.classList.add('gone')
    this.hiddenCards.add(gi)
    const g = el('g', { class: 'bubble' }, this.layer.bubbles)
    el('rect', { x, y, width: w, height: h, rx: 11 }, g)
    const tail = Math.max(x + 14, Math.min(x + w - 14, v.pos.x))
    el('path', { d: `M${tail - 7},${y + h - 1} L${v.pos.x},${y + h + 9} L${tail + 7},${y + h - 1}Z` }, g)
    text(x + w / 2, y + 22, line, '', g)
    this.tell(this.t('deck.says', { name: PERSONAS[gi].name, line }))
    return { x, w }
  }

  /**
   * A panel over the dimmed scene: how a system works, a spokesperson thinking
   * a tactic through, or what went wrong and what Riverton tries next.
   * With `thinker`, a trail of little clouds leads to that spokesperson.
   */
  private panel(eyebrow: string, parts: { title?: string; body: string; numbered?: boolean; lead?: boolean }[], thinker?: number) {
    this.clearBubbles()
    DIMMED.forEach((id) => this.layer[id].classList.add('dim'))
    const x = 290
    const w = 700
    const y = 146
    const g = el('g', { class: 'thought pop' }, this.layer.thought)
    const box = el('rect', { x, y, width: w, height: 0, rx: 28 }, g)
    let cursor = y + 38
    text(x + 34, cursor, eyebrow.toUpperCase(), 'small-caps', g, 'start')
    parts.forEach((part, i) => {
      if (i > 0) {
        cursor += 14
        el('line', { x1: x + 34, x2: x + w - 34, y1: cursor, y2: cursor, class: 'thought-rule' }, g)
        cursor += 6
      }
      if (part.title) {
        cursor += 26
        text(x + 34, cursor, part.title.toUpperCase(), 'thought-name', g, 'start')
      }
      const size = part.lead ? 30 : 26
      const steps = part.body.split('\n')
      steps.forEach((step, n) => {
        const indent = part.numbered ? 30 : 0
        wrap(step, part.lead ? 56 : 70).forEach((line, j) => {
          cursor += size
          if (part.numbered && j === 0) text(x + 34, cursor, String(n + 1), 'thought-step', g, 'start')
          text(x + 34 + indent, cursor, line, part.lead ? 'thought-text' : 'thought-def', g, 'start')
        })
      })
    })
    const h = cursor - y + 24
    box.setAttribute('height', String(h))
    if (thinker !== undefined) {
      const v = this.spokes[thinker]
      this.groups[thinker].card.classList.add('gone')
      this.hiddenCards.add(thinker)
      const from = { x: Math.max(x + 50, Math.min(x + w - 50, v.pos.x)), y: y + h + 16 }
      const to = { x: v.pos.x, y: v.pos.y - v.r - 12 }
      for (const [f, r] of [[0, 11], [0.45, 8], [0.8, 5]]) {
        el('circle', { cx: from.x + (to.x - from.x) * f, cy: from.y + (to.y - from.y) * f, r, class: 'thought-dot' }, g)
      }
    }
    this.tell([eyebrow, ...parts.map((p) => (p.title ? `${p.title}: ${p.body}` : p.body))].join(' ').replace(/\n/g, ' '))
  }

  private unpanel() {
    this.layer.thought.replaceChildren()
    DIMMED.forEach((id) => this.layer[id].classList.remove('dim'))
    this.clearBubbles()
  }

  /** A spokesperson thinks a tactic through: the reasoning, then the tactic's name and definition. */
  private think(gi: number, key: string) {
    this.panel(this.t('deck.thinks', { name: PERSONAS[gi].name }), [
      { body: this.t(`${key}.think`), lead: true },
      { title: this.t(`${key}.tactic`), body: this.t(`${key}.definition`) },
    ], gi)
  }

  /** How a system works, before the reader bets on it. */
  private async how(key: string) {
    this.panel(this.t('deck.panel.how'), [{ body: this.t(`${key}.how`), numbered: true, lead: true }])
    await this.tap()
    this.unpanel()
  }

  /** Once the reader has seen the result: what went wrong, and what Riverton tries next. */
  private async lesson(key: string, params: Record<string, string | number> = {}, idea = true) {
    await this.tap()
    const parts = [{ title: this.t('deck.panel.problem'), body: this.t(`${key}.problem`, params) }]
    if (idea) parts.push({ title: this.t('deck.panel.idea'), body: this.t(`${key}.idea`) })
    this.panel(this.t(`${key}.title`), parts)
  }

  private voice(gi: number, kind: 'best' | 'worst' | 'why') {
    return this.t(`deck.voices.${PERSONAS[gi].key}.${kind}`)
  }

  /** Every voter wears the result; the happiest and unhappiest spokespeople say so. */
  private react(winner: number, voices = true) {
    this.clearBubbles()
    PERSONAS.forEach((p, gi) => {
      const place = p.ranking.indexOf(winner)
      this.voters.filter((v) => v.g === gi).forEach((v, i) => this.setMood(v, 2 - place, i * 25))
    })
    if (!voices) return
    const placed: { x: number; w: number }[] = []
    const best = PERSONAS.findIndex((p) => p.ranking[0] === winner)
    const worst = PERSONAS.findIndex((p) => p.ranking[p.ranking.length - 1] === winner)
    if (best >= 0) placed.push(this.say(best, this.voice(best, 'best'), placed))
    if (worst >= 0) placed.push(this.say(worst, this.voice(worst, 'worst'), placed))
  }

  /** A stamp, and what a screen reader hears of it. */
  private stamp(x: number, y: number, label: string, heard: string, tone = '') {
    const w = textWidth(label, 16) * 1.12 + 28
    const g = el('g', { class: 'stamp ' + tone, 'aria-hidden': 'true' }, this.layer.stamps)
    const inner = el('g', { transform: `translate(${x},${y}) rotate(-7)` }, g)
    el('rect', { x: -w / 2, y: -18, width: w, height: 34, rx: 6 }, inner)
    text(0, 6, label.toUpperCase(), '', inner)
    this.tell(heard)
  }

  /** A group's tactic, stamped under it. */
  private groupStamp(gi: number, label: string, tone = '') {
    this.stamp(this.groups[gi].cx, 604, label, this.t('deck.groupStamp', { name: PERSONAS[gi].name, stamp: label }), tone)
  }

  private note(x: number, y: number, s: string, anchor: 'start' | 'middle' | 'end' = 'middle') {
    return text(x, y, s.toUpperCase(), 'small-caps pop', this.layer.notes, anchor)
  }

  private bracket(x1: number, x2: number, y: number, label: string) {
    const g = el('g', { class: 'pop' }, this.layer.notes)
    el('path', { class: 'bracket', d: `M${x1},${y + 8} V${y} H${x2} V${y + 8} M${(x1 + x2) / 2},${y} V${y - 6}` }, g)
    text((x1 + x2) / 2, y - 12, label.toUpperCase(), 'small-caps', g)
  }

  /** Ballots or points gained (n > 0) or lost by candidate c, floating up from x, y. */
  private float(x: number, y: number, c: number, n: number) {
    const t = text(x, y, (n > 0 ? '+' : '−') + Math.abs(n), 'float ' + (n > 0 ? 'good-text' : 'bad-text'), this.layer.notes)
    t.setAttribute('aria-hidden', 'true')
    this.tell(this.t(n > 0 ? 'deck.gains' : 'deck.loses', { name: NAME[c], n: Math.abs(n) }))
    // With reduced motion it stays a moment where it would have floated to.
    const gone = this.anim.reduced
      ? (t.setAttribute('y', String(y - 28)), this.anim.hold(1200))
      : this.anim.animate(1200, (k) => {
          t.setAttribute('y', String(y - 28 * easeOut(k)))
          t.style.opacity = String(1 - Math.max(0, k - 0.6) / 0.4)
        })
    void gone.then(() => t.remove())
  }

  private makeButton(parent: SVGGElement, kind = ''): Button {
    let action = () => {}
    const g = el('g', { class: 'sbtn ' + kind }, parent)
    const rect = el('rect', { height: 40, rx: 20 }, g)
    const words = text(0, 0, '', '', g)
    asButton(g, '', () => action())
    return {
      g,
      draw: (label, x, y, k = '', { before, after } = {}, right = false) => {
        const shown = [before, label, after].filter(Boolean).join(' ')
        const w = textWidth(shown, 17) + 40
        const left = right ? x - w : x
        g.setAttribute('class', `sbtn ${kind} ${k}`)
        g.setAttribute('aria-label', label)
        Object.entries({ x: left, y, width: w }).forEach(([a, v]) => rect.setAttribute(a, String(v)))
        Object.entries({ x: left + w / 2, y: y + 26 }).forEach(([a, v]) => words.setAttribute(a, String(v)))
        words.textContent = shown
        return w
      },
      onPress: (f) => (action = f),
      show: (on) => (on ? g.removeAttribute('display') : g.setAttribute('display', 'none')),
    }
  }

  private button(parent: SVGGElement, x: number, y: number, label: string, onClick: () => void, kind: Kind = '', glyphs: Glyphs = {}, right = false) {
    const b = this.makeButton(parent, 'pop')
    b.onPress(onClick)
    return { w: b.draw(label, x, y, kind, glyphs, right), g: b.g }
  }

  /** Waits for the reader: a click anywhere, or →, Space or Enter. A button shows bottom right. */
  private tap(): Promise<void> {
    const my = this.gen
    return new Promise((resolve) => {
      const parent = this.layer.buttons
      parent.replaceChildren()
      const done = () => {
        if (my !== this.gen || this.waiting !== done) return
        this.waiting = null
        this.release(parent)
        parent.replaceChildren()
        resolve()
      }
      this.offer(this.button(parent, 1240, 672, this.t('deck.next'), done, 'ghost', { after: '▸' }, true).g)
      this.waiting = done
    })
  }

  /** Choices, bottom right, where the thumb is. Resolves with the index pressed. */
  private ask(list: { label: string; primary?: boolean; glyphs?: Glyphs }[]): Promise<number> {
    const my = this.gen
    return new Promise((resolve) => {
      const parent = this.layer.buttons
      parent.replaceChildren()
      let x = 1240
      let first: SVGGElement | null = null
      for (let i = list.length - 1; i >= 0; i--) {
        const { label, primary, glyphs } = list[i]
        const b = this.button(parent, x, 672, label, () => {
          if (my !== this.gen) return
          this.release(parent)
          parent.replaceChildren()
          resolve(i)
        }, primary ? 'primary' : '', glyphs, true)
        x -= b.w + 12
        first = b.g
      }
      if (first) this.offer(first)
    })
  }

  // ---- The game: tap a candidate to bet; the board top right keeps score.

  private bet(points: { x: number; y: number; r: number; labelY: number }[]): Promise<number> {
    const my = this.gen
    return new Promise((resolve) => {
      const picks = this.layer.picks
      picks.replaceChildren()
      const hits = points.map((p, c) => {
        el('circle', { cx: p.x, cy: p.y, r: p.r + 3, class: 'pulse' }, picks)
        const hit = el('circle', { cx: p.x, cy: p.y, r: p.r + 9, class: 'hit' }, picks)
        asButton(hit, this.t('deck.bet.on', { name: NAME[c] }), () => {
          if (my !== this.gen) return
          this.release(picks)
          picks.replaceChildren()
          this.tell(this.t('deck.bet.placed', { name: NAME[c] }))
          const g = el('g', {}, this.layer.notes)
          this.betMark = {
            c,
            ring: el('circle', { cx: p.x, cy: p.y, r: p.r + 7, class: 'ring' }, g),
            label: text(p.x, p.labelY, this.t('deck.bet.yours').toUpperCase(), 'bet-label', g),
          }
          resolve(c)
        })
        return hit
      })
      this.offer(hits[0])
    })
  }

  private winnerOf(system: System): number {
    const d = this.o.data
    if (system === 'duels') return d.condorcetWinner
    if (system === 'twoRound') return d.honest.two_round.winner
    return d.honest[system].winner
  }

  private settle(system: System, winner = this.winnerOf(system)) {
    const i = SYSTEMS.indexOf(system)
    memory.known[i] = true
    if (this.betMark) {
      const right = this.betMark.c === winner
      this.betMark.ring.setAttribute('class', 'ring ' + (right ? 'good' : 'bad'))
      this.betMark.label.setAttribute('class', 'bet-label ' + (right ? 'good-text' : 'bad-text'))
      this.betMark.label.textContent = `${right ? '✓' : '✗'} ${this.t('deck.bet.yours').toUpperCase()}`
      memory.bets[i] = right
      this.tell(this.t(right ? 'deck.bet.right' : 'deck.bet.wrong', { name: NAME[this.betMark.c] }))
      const placed = memory.bets.filter((b) => b !== null)
      this.tell(this.t('deck.bet.score', { score: placed.filter(Boolean).length, total: placed.length }))
      this.betMark = null
    }
    this.drawHud()
  }

  private drawHud() {
    const hud = this.layer.hud
    hud.replaceChildren()
    text(1022, 86, this.t('deck.bet.board').toUpperCase(), 'small-caps', hud, 'start')
    const said = [this.t('deck.hud.title')]
    SYSTEMS.forEach((s, i) => {
      const x = 1022 + i * 36
      const g = el('g', { class: 'cell' }, hud)
      const system = this.t(`deck.systems.${s}`)
      el('title', {}, g).textContent = system
      const b = memory.bets[i]
      if (memory.known[i]) {
        token(x + 15, 109, 15, this.winnerOf(s), g, 13)
        const how = b === null ? 'won' : b ? 'right' : 'wrong'
        said.push(this.t(`deck.hud.${how}`, { system, winner: NAME[this.winnerOf(s)] }))
      } else {
        el('rect', { x, y: 94, width: 30, height: 30, rx: 15 }, g)
        text(x + 15, 114, '?', 'small-caps', g)
        said.push(this.t('deck.hud.pending', { system }))
      }
      if (b !== null) text(x + 15, 142, b ? '✓' : '✗', 'small-caps ' + (b ? 'good-text' : 'bad-text'), g)
    })
    hud.setAttribute('aria-label', said.join(' '))
  }

  /**
   * The slide dots, one button each. Like a toolbar, only the current one is in
   * the tab order; ← and → move between them, Enter or Space goes there.
   */
  private buildDots() {
    const bar = el('g', { role: 'toolbar' }, this.layer.nav)
    const x0 = 640 - ((TownStage.SLIDES - 1) * DOT_GAP) / 2
    for (let i = 0; i < TownStage.SLIDES; i++) {
      const g = el('g', { class: 'dot-btn' }, bar)
      el('rect', { x: x0 + i * DOT_GAP - DOT_GAP / 2, y: 670, width: DOT_GAP, height: 44, rx: 8, class: 'dot-hit' }, g)
      el('circle', { cx: x0 + i * DOT_GAP, cy: 692, r: 4.5, class: 'dot' }, g)
      asButton(g, '', () => this.o.navigate(i))
      g.addEventListener('keydown', (event) => {
        const key = (event as KeyboardEvent).key
        const to = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: TownStage.SLIDES - 1 }[key]
        if (to === undefined) return
        event.preventDefault()
        event.stopPropagation()
        this.dots[Math.max(0, Math.min(TownStage.SLIDES - 1, to))].focus()
      })
      this.dots.push(g)
    }
  }

  /** Back bottom left, the slide dots, and Skip (or Start over) top right. */
  private drawNav() {
    const last = this.current === TownStage.SLIDES - 1
    this.back.show(this.current > 0)
    this.back.draw(this.t('deck.back'), 40, 672, 'ghost', { before: '←' })
    this.back.onPress(() => this.o.navigate(this.current - 1))
    if (!last) {
      this.corner.draw(this.t('deck.skip'), 1240, 30, 'ghost', { after: '⏭' }, true)
      this.corner.onPress(() => this.o.navigate(this.current + 1))
    } else {
      this.corner.draw(this.t('deck.startOver'), 1240, 30, 'primary', { before: '↺' }, true)
      this.corner.onPress(() => {
        memory.bets.fill(null)
        memory.known.fill(false)
        this.o.navigate(0)
      })
    }
    this.dots[0].parentElement?.setAttribute('aria-label', this.t('deck.slides'))
    this.dots.forEach((g, i) => {
      const here = i === this.current
      g.setAttribute('aria-label', this.t('deck.slide', { n: i + 1, total: TownStage.SLIDES }))
      g.setAttribute('tabindex', here ? '0' : '-1')
      if (here) g.setAttribute('aria-current', 'step')
      else g.removeAttribute('aria-current')
      const dot = g.querySelector('.dot')!
      dot.setAttribute('r', here ? '6' : '4.5')
      dot.classList.toggle('here', here)
    })
  }

  // ---- The crown.

  private crownAt(x: number, y: number, instant = false) {
    const from = this.crownPos && !instant ? { ...this.crownPos } : { x, y: instant ? y : y - 90 }
    const first = !this.crownPos
    this.crownPos = { x, y }
    this.crown.setAttribute('transform', `translate(${from.x},${from.y})`)
    this.crown.classList.remove('gone')
    if (instant) return Promise.resolve()
    return this.anim.animate(first ? 650 : 560, (t) => {
      const e = first ? back(t) : ease(t)
      const lift = first ? 0 : Math.sin(t * Math.PI) * 44
      this.crown.setAttribute('transform', `translate(${from.x + (x - from.x) * e},${from.y + (y - from.y) * e - lift})`)
    })
  }

  // ---- Piles.

  private slot = (c: number, k: number) => ({ x: COLX[c], y: BASE - STEP * k - 5 })
  private pileTop = (c: number) => BASE - STEP * this.landed[c]
  private rowPoints = () => CANDIDATES.map((_, c) => ({ x: COLX[c], y: TOKEN_Y, r: 20, labelY: 492 }))

  private candidateRow() {
    return CANDIDATES.map((cand, c) => {
      const g = el('g', {}, this.layer.machine)
      el('line', { x1: COLX[c] - 36, x2: COLX[c] + 36, y1: BASE + 1, y2: BASE + 1, class: 'baseline' }, g)
      token(COLX[c], TOKEN_Y, 20, c, g, 18)
      text(COLX[c], 474, cand.name, 'cand-name', g)
      return g
    })
  }

  private buildPiles(majority = true) {
    if (majority) {
      const y = BASE - STEP * MAJORITY
      el('line', { x1: 48, x2: 1232, y1: y, y2: y, class: 'majority' }, this.layer.machine)
      text(1232, y - 8, this.t('deck.majority', { n: MAJORITY }).toUpperCase(), 'small-caps', this.layer.machine, 'end')
    }
    const tokens = this.candidateRow()
    this.cols = CANDIDATES.map((_, c) => ({ token: tokens[c], count: text(COLX[c], BASE - 12, '', 'count', this.layer.machine) }))
    this.stacks = CANDIDATES.map(() => [])
    this.landed = CANDIDATES.map(() => 0)
    this.active = CANDIDATES.map(() => true)
  }

  private land(c: number, d: number) {
    this.landed[c] += d
    const label = this.cols[c].count
    label.textContent = this.landed[c] ? String(this.landed[c]) : ''
    label.setAttribute('y', String(this.pileTop(c) - 12))
  }

  private crownPile = (c: number, instant = false) => this.crownAt(COLX[c], this.pileTop(c) - 44, instant)

  /** Throws [item, candidate] pairs into the piles, group by group. */
  private dropAll(list: [Item, number][], fast: boolean) {
    return Promise.all(
      list.map(([item, c], i) => {
        const k = this.stacks[c].length
        this.stacks[c].push(item)
        const v = item.v
        const delay = fast ? v.g * 110 + v.k * 22 + (i % 2) * 8 : v.g * 420 + v.k * 75 + (i % 2) * 30
        return this.fly(item, this.slot(c, k), { dur: fast ? 460 : 700, delay, lift: 70 + ((v.k * 37) % 50) }).then(() => this.land(c, 1))
      }),
    )
  }

  private firstChoices = (): [Item, number][] => this.voters.map((v) => [v.ballot, v.ranking[0]])

  private placeFirstChoices() {
    this.voters.forEach((v) => {
      const c = v.ranking[0]
      this.place(v.ballot, this.slot(c, this.stacks[c].length), 1, 0)
      this.stacks[c].push(v.ballot)
      this.land(c, 1)
    })
  }

  private async movePile(from: number, pick: (v: Voter) => number, fast: boolean) {
    const moving = this.stacks[from].slice().reverse()
    this.stacks[from] = []
    this.landed[from] = 0
    this.land(from, 0)
    await Promise.all(
      moving.map((item, i) => {
        const to = pick(item.v)
        const k = this.stacks[to].length
        this.stacks[to].push(item)
        return this.fly(item, this.slot(to, k), { dur: fast ? 480 : 700, delay: i * (fast ? 40 : 90), lift: 70, recolor: to }).then(() => this.land(to, 1))
      }),
    )
    return moving
  }

  /**
   * The ballots in c's pile that now count for someone else move there; the rest
   * close ranks. Piles that send ballots to each other go one after the other.
   */
  private async regroup(c: number, pick: (v: Voter) => number) {
    const leaving = this.stacks[c].filter((item) => pick(item.v) !== c)
    if (!leaving.length) return
    this.stacks[c] = this.stacks[c].filter((item) => !leaving.includes(item))
    this.landed[c] = this.stacks[c].length
    this.land(c, 0)
    await Promise.all([
      ...this.stacks[c].map((item, i) => this.fly(item, this.slot(c, i), { dur: 360, lift: 0 })),
      ...leaving.map((item, i) => {
        const to = pick(item.v)
        const k = this.stacks[to].length
        this.stacks[to].push(item)
        return this.fly(item, this.slot(to, k), { dur: 800, delay: i * 140, lift: 80, recolor: to }).then(() => this.land(to, 1))
      }),
    ])
  }

  /** Who beats c one on one, by the server's counts. */
  private beaters(c: number) {
    const m = this.o.data.matrix
    return CANDIDATES.map((_, x) => x).filter((x) => m[x][c] > m[c][x])
  }

  private shake(c: number) {
    return this.anim.animate(420, (t) => {
      const dx = Math.sin(t * Math.PI * 9) * (1 - t) * 6
      this.stacks[c].forEach((item, k) => {
        const p = this.slot(c, k)
        this.place(item, { x: p.x + dx, y: p.y }, 1, 0)
      })
    })
  }

  private knockOut(c: number) {
    this.active[c] = false
    this.cols[c].token.classList.add('out')
    this.stamp(COLX[c], TOKEN_Y, this.t('deck.out'), this.t('deck.isOut', { name: NAME[c] }), 'bad')
  }

  // ---- Jars of points.

  private buildJars() {
    this.candidateRow()
    const pts = CANDIDATES.map(() => 0)
    const jars = CANDIDATES.map((_, c) => {
      el('rect', { x: COLX[c] - 32, y: JAR_TOP, width: 64, height: JAR_H, rx: 13, class: 'jar' }, this.layer.machine)
      const fill = el('rect', { x: COLX[c] - 30, y: BASE - 1, width: 60, height: 0, rx: 10, class: 'jar-fill c' + c }, this.layer.machine)
      return { fill, label: text(COLX[c], JAR_TOP - 12, '0', 'count', this.layer.machine) }
    })
    const show = (c: number) => {
      const h = Math.min(JAR_H - 4, pts[c] * PX)
      jars[c].fill.setAttribute('y', String(BASE - 2 - h))
      jars[c].fill.setAttribute('height', String(h))
      jars[c].label.textContent = String(pts[c])
    }
    const coin = (from: Point, c: number, delay: number, dur: number, onLand: () => void) => {
      const dot = el('circle', { r: 5.5, class: 'coin c' + c }, this.layer.coins)
      dot.setAttribute('transform', `translate(${from.x},${from.y})`)
      const tx = COLX[c] + (((delay * 7) % 34) - 17)
      return this.anim
        .animate(dur, (t) => {
          // Aim at the jar's current level, which rises while the coin is in the air.
          const p = arc(from, { x: tx, y: BASE - 6 - pts[c] * PX }, 90, ease(t))
          dot.setAttribute('transform', `translate(${p.x},${p.y})`)
        }, delay)
        .then(() => {
          dot.remove()
          onLand()
        })
    }
    return { pts, show, coin }
  }

  private crownJar(pts: number[], instant = false) {
    return this.crownAt(COLX[pts.indexOf(Math.max(...pts))], JAR_TOP - 48, instant)
  }

  // ---- Leaving a slide.

  private reset() {
    this.gen++
    this.waiting = null
    this.anim.cancel()
    // What the last slide had still to say is dropped, and the live region emptied.
    window.clearTimeout(this.hearing)
    this.hearing = 0
    this.heard = []
    this.o.announce('')
    for (const id of ['machine', 'notes', 'coins', 'stamps', 'buttons', 'picks', 'thought']) this.layer[id].replaceChildren()
    DIMMED.forEach((id) => this.layer[id].classList.remove('dim'))
    this.layer.items.querySelectorAll('.extra').forEach((e) => e.remove())
    this.clearBubbles()
    this.words('')
    this.crown.classList.add('gone')
    this.crownPos = null
    this.betMark = null
    this.voters.forEach((v) => {
      v.mood = 0
      v.mouth.setAttribute('d', mouthPath(v.r, 0))
      this.paint(v.ballot, v.ranking[0])
      this.toHand(v.ballot)
      v.ballot.g.classList.remove('gone')
    })
  }

  // =====================================================================
  // The slides.
  // =====================================================================

  private readonly slides: (() => Promise<void>)[] = [
    () => this.sTown(),
    () => this.sPersonas(),
    () => this.sGroups(),
    () => this.sGame(),
    () => this.sPlurality(),
    () => this.sCompromise(),
    () => this.sTwoRound(),
    () => this.sPushOver(),
    () => this.sIrv(),
    () => this.sBorda(),
    () => this.sBury(),
    () => this.sDuels(),
    () => this.sApproval(),
    () => this.sSummary(),
  ]

  private async sTown() {
    this.emptyLayout()
    this.words(this.t('deck.town.title'), this.t('deck.town.caption'))
    CANDIDATES.forEach((cand, c) => {
      const g = el('g', { class: 'pop' }, this.layer.machine)
      g.style.animationDelay = c * 0.12 + 's'
      token(COLX[c], 290, 48, c, g, 38)
      // First name over surname: the full names are too wide for one line each.
      const [first, ...rest] = cand.fullName.split(' ')
      text(COLX[c], 376, first, 'cand-name big-name', g)
      text(COLX[c], 402, rest.join(' '), 'cand-name big-name', g)
      wrap(candidateRole(cand), 24).forEach((line, i) => text(COLX[c], 430 + i * 20, line, 'muted role', g))
    })
  }

  /** The five spokespeople and their rankings, favourite first. */
  private ladders(parent: SVGGElement, reveal: boolean) {
    PERSONAS.forEach((p, gi) => {
      const x = COLX[gi]
      const head = el('g', { class: reveal ? 'pop' : '' }, parent)
      text(x, 268, p.name, 'cand-name big-name', head)
      wrap(this.t(`cast.personas.${p.key}.role`), 24).forEach((line, i) => text(x, 292 + i * 18, line, 'muted small-role', head))
      p.ranking.forEach((c, i) => {
        const chip = el('g', { class: 'chip' + (reveal ? ' pop' : '') }, parent)
        if (reveal) chip.style.animationDelay = gi * 0.15 + i * 0.09 + 's'
        const y = 336 + i * 38
        el('rect', { x: x - 84, y, width: 168, height: 30, rx: 15 }, chip)
        text(x - 68, y + 20, String(i + 1), 'rank', chip)
        token(x - 44, y + 15, 10, c, chip, 11)
        text(x - 28, y + 21, NAME[c], 'nm', chip, 'start')
      })
    })
  }

  private async sPersonas() {
    this.personaLayout()
    this.words(this.t('deck.personas.title'), this.t('deck.personas.caption'))
    this.ladders(this.layer.machine, true)
    const my = this.gen
    PERSONAS.forEach((p, gi) => {
      const hit = el('circle', { cx: COLX[gi], cy: PERSONA_Y, r: 48, class: 'hit' }, this.layer.picks)
      asButton(hit, this.t('deck.personas.why', { name: p.name }), () => {
        if (my !== this.gen) return
        this.layer.bubbles.replaceChildren()
        const lines = wrap(this.voice(gi, 'why'), 26)
        const w = 236
        const h = 20 + lines.length * 20
        const x = Math.max(8, Math.min(1272 - w, COLX[gi] - w / 2))
        const y = 536
        const b = el('g', { class: 'bubble' }, this.layer.bubbles)
        el('rect', { x, y, width: w, height: h, rx: 12 }, b)
        el('path', { d: `M${COLX[gi] - 8},${y + 1} L${COLX[gi]},${y - 10} L${COLX[gi] + 8},${y + 1}Z` }, b)
        lines.forEach((line, i) => text(x + w / 2, y + 26 + i * 20, line, '', b))
        this.spokes.forEach((v) => this.setMood(v, v.g === gi ? 1 : 0))
        this.tell(this.t('deck.says', { name: p.name, line: this.voice(gi, 'why') }))
      })
    })
  }

  private async sGroups() {
    this.personaLayout()
    this.words(this.t('deck.groups.title'), this.t('deck.groups.caption'))
    const lad = el('g', { class: 'fade' }, this.layer.machine)
    this.ladders(lad, false)
    const counter = text(640, 330, String(PERSONAS.length), 'huge gone fade', this.layer.machine)
    const unit = text(640, 372, this.t('deck.voters').toUpperCase(), 'small-caps gone fade', this.layer.machine)
    await this.anim.sleep(500)
    lad.classList.add('gone')
    counter.classList.remove('gone')
    unit.classList.remove('gone')
    this.layer.labels.classList.remove('gone')
    await Promise.all(this.spokes.map((v, i) => this.move(v, v.home, 1, 800, i * 80)))
    this.layer.cards.classList.remove('gone')
    let n = PERSONAS.length
    await Promise.all(
      this.voters
        .filter((v) => !v.spoke)
        .map((v) =>
          this.anim.animate(420, (t) => this.setNode(v, v.home.x, v.home.y, back(t)), 300 + v.g * 260 + v.k * 70).then(() => {
            counter.textContent = String(++n)
          }),
        ),
    )
    counter.textContent = String(TOTAL)
    this.layer.items.classList.remove('gone')
    this.note(640, 400, PERSONAS.map((p) => `${p.name} ×${p.voters}`).join(' · '))
  }

  private async sGame() {
    this.crowdLayout()
    this.words(this.t('deck.game.title'), this.t('deck.game.caption', { n: TOTAL }))
    SYSTEMS.forEach((s, i) => {
      const g = el('g', { class: 'pop' }, this.layer.machine)
      g.style.animationDelay = i * 0.1 + 's'
      const x = 70 + i * 194
      el('rect', { x, y: 190, width: 174, height: 190, rx: 16, class: 'card' }, g)
      this.cardTitle(x + 87, 228, this.t(`deck.systems.${s}`), g)
      el('circle', { cx: x + 87, cy: 300, r: 36, class: 'slot-ring' }, g)
      text(x + 87, 314, '?', 'big muted', g)
      text(x + 87, 362, this.t('deck.bet.yours').toUpperCase(), 'small-caps', g)
    })
  }

  /** A system's name on a card, on two lines when it is too wide for one. */
  private cardTitle(x: number, y: number, name: string, parent: SVGGElement) {
    const lines = textWidth(name, 18) > 160 ? wrap(name, Math.ceil(name.length / 2)) : [name]
    lines.forEach((line, i) => text(x, y + (i - (lines.length - 1) / 2) * 22, line, 'cand-name', parent))
  }

  // ---- 1. First past the post.
  private async sPlurality() {
    this.crowdLayout()
    this.buildPiles()
    const k = 'deck.plurality'
    this.words(this.t(`${k}.title`), this.t(`${k}.ask`))
    await this.how(k)
    await this.bet(this.rowPoints())
    this.setCaption(this.t(`${k}.rule`))
    await this.beat(500)
    await this.dropAll(this.firstChoices(), false)
    const outcome = this.o.data.honest.plurality
    const w = outcome.winner
    const votes = tallies(outcome)[w]
    await this.crownPile(w)
    this.setCaption(this.t(`${k}.result`, { winner: NAME[w], votes, total: TOTAL, majority: MAJORITY }))
    this.settle('plurality')
    this.react(w)
    const others = COLX.filter((_, c) => c !== w)
    const tops = CANDIDATES.map((_, c) => (c === w ? Infinity : this.pileTop(c)))
    this.bracket(Math.min(...others) - 40, Math.max(...others) + 40, Math.min(...tops) - 46, this.t(`${k}.others`, { n: TOTAL - votes }))
    const last = PERSONAS.filter((p) => p.ranking[p.ranking.length - 1] === w).reduce((n, p) => n + p.voters, 0)
    const beaters = this.o.list(this.beaters(w).map((c) => NAME[c]))
    await this.lesson(k, { winner: NAME[w], split: TOTAL - votes, total: TOTAL, last, beaters }, false)
  }

  // ---- The lesser evil (vote utile).
  private async sCompromise() {
    this.crowdLayout()
    this.buildPiles()
    this.placeFirstChoices()
    const honest = this.o.data.honest.plurality.winner
    void this.crownPile(honest, true)
    this.react(honest, false)
    const k = 'deck.compromise'
    this.words(this.t(`${k}.title`), this.t(`${k}.caption`))
    this.think(AIDA, k)
    await this.tap()
    this.unpanel()
    // Aïda's group is the only one with Melon first, so her whole pile moves.
    const target = PERSONAS[AIDA].ranking[1]
    await this.movePile(PERSONAS[AIDA].ranking[0], () => target, false)
    const outcome = this.o.data.compromise
    const w = outcome.winner
    await this.crownPile(w)
    const totals = tallies(outcome)
    this.setCaption(this.t(`${k}.result`, { winner: NAME[w], votes: totals[w], next: runnerUp(totals, w).votes }))
    this.react(w, false)
    const placed = [this.say(AIDA, this.t(`${k}.after`))]
    const fan = PERSONAS.findIndex((p) => p.ranking[0] === w)
    if (fan >= 0 && fan !== AIDA) this.say(fan, this.voice(fan, 'best'), placed)
    this.groupStamp(AIDA, this.t(`${k}.stamp`))
    await this.lesson(k)
  }

  // ---- 2. Two rounds.
  private async sTwoRound() {
    this.crowdLayout()
    this.buildPiles()
    const k = 'deck.twoRound'
    this.words(this.t(`${k}.title`), this.t(`${k}.ask`))
    await this.how(k)
    await this.bet(this.rowPoints())
    this.setCaption(this.t(`${k}.rule`))
    await this.beat(500)
    await this.dropAll(this.firstChoices(), true)
    const outcome = this.o.data.honest.two_round
    const [a, b] = finalists(outcome)
    const outs = CANDIDATES.map((_, c) => c).filter((c) => c !== a && c !== b)
    outs.forEach((c) => this.knockOut(c))
    this.setCaption(this.t(`${k}.through`, { majority: MAJORITY, a: NAME[a], b: NAME[b] }))
    await this.tap()
    const pick = (v: Voter) => (prefers(v.ranking, a, b) ? a : b)
    await Promise.all(outs.map((c) => this.movePile(c, pick, false)))
    const w = outcome.winner
    await this.crownPile(w)
    const final = tallies(outcome, outcome.rounds.length - 1)
    this.setCaption(
      this.t(`${k}.result`, { winner: NAME[w], votes: final[w], next: runnerUp(final, w).votes, others: this.o.list(outs.map((c) => NAME[c])) }),
    )
    this.settle('twoRound')
    this.react(w)
    await this.lesson(k, {}, false)
  }

  // ---- The push-over: vote for a weak rival in round one, to face them in the runoff.
  private async sPushOver() {
    this.crowdLayout()
    this.buildPiles()
    this.placeFirstChoices()
    const d = this.o.data
    const fav = PERSONAS[PUSH.group].ranking[0]
    const k = 'deck.pushOver'
    this.words(this.t(`${k}.title`), this.t(`${k}.caption`))
    this.think(PUSH.group, k)
    await this.tap()
    this.unpanel()
    // A few of the group's voters, not its spokesperson, mark the weak rival.
    const pushers = new Set(this.voters.filter((v) => v.g === PUSH.group && !v.spoke).slice(-PUSH.voters))
    await this.regroup(fav, (v) => (pushers.has(v) ? PUSH.mark : fav))
    this.groupStamp(PUSH.group, this.t(`${k}.stamp`))
    const [a, b] = finalists(d.pushOver)
    const outs = CANDIDATES.map((_, c) => c).filter((c) => c !== a && c !== b)
    outs.forEach((c) => this.knockOut(c))
    this.setCaption(this.t('deck.twoRound.through', { majority: MAJORITY, a: NAME[a], b: NAME[b] }))
    await this.tap()
    // Round two: everyone votes their true preference again, the pushers first.
    const pick = (v: Voter) => (prefers(v.ranking, a, b) ? a : b)
    await Promise.all([a, b].map((c) => this.regroup(c, pick)))
    await Promise.all(outs.map((c) => this.regroup(c, pick)))
    const w = d.matrix[a][b] > d.matrix[b][a] ? a : b
    const l = w === a ? b : a
    await this.crownPile(w)
    this.setCaption(this.t(`${k}.result`, { winner: NAME[w], votes: d.matrix[w][l], next: d.matrix[l][w], n: PUSH.voters, mark: NAME[PUSH.mark] }))
    this.react(w, false)
    this.say(PUSH.group, this.t(`${k}.after`))
    await this.lesson(k)
  }

  // ---- 3. Instant runoff.
  private async sIrv() {
    this.crowdLayout()
    this.buildPiles()
    const k = 'deck.irv'
    this.words(this.t(`${k}.title`), this.t(`${k}.ask`))
    await this.how(k)
    await this.bet(this.rowPoints())
    this.setCaption(this.t(`${k}.rule`))
    await this.beat(500)
    await this.dropAll(this.firstChoices(), true)
    const outcome = this.o.data.honest.irv
    const order = eliminations(outcome)
    for (const [round, out] of order.entries()) {
      this.setCaption(this.t(`${k}.round`, { n: round + 1, majority: MAJORITY }))
      await this.beat(1100)
      await this.shake(out)
      this.knockOut(out)
      const moved = await this.movePile(out, (v) => nextChoice(v.ranking, this.active), false)
      const gains = new Map<number, number>()
      moved.forEach((item) => {
        const to = nextChoice(item.v.ranking, this.active)
        gains.set(to, (gains.get(to) ?? 0) + 1)
      })
      gains.forEach((n, c) => this.float(COLX[c] + 40, this.pileTop(c) - 4, c, n))
      await this.beat(400)
    }
    const w = outcome.winner
    await this.crownPile(w)
    const final = tallies(outcome, outcome.rounds.length - 1)
    this.setCaption(this.t(`${k}.result`, { winner: NAME[w], votes: final[w], first: NAME[order[0]] }))
    this.settle('irv')
    this.react(w)
    const cw = this.o.data.condorcetWinner
    const beaters = this.o.list(this.beaters(w).map((c) => NAME[c]))
    await this.lesson(k, { winner: NAME[w], beaters, cw: NAME[cw], round: order.indexOf(cw) + 1 })
  }

  // ---- 4. Borda points.
  private async sBorda() {
    this.crowdLayout({ ballots: false })
    const { pts, show, coin } = this.buildJars()
    const k = 'deck.borda'
    this.words(this.t(`${k}.title`), this.t(`${k}.ask`))
    const strip = el('g', { class: 'strip pop' }, this.layer.notes)
    el('rect', { x: 48, y: 140, width: 430, height: 32, rx: 9 }, strip)
    const places = ['first', 'second', 'third', 'fourth', 'last'] as const
    places.forEach((p, i) => {
      const x = 64 + i * 82
      text(x, 161, this.t(`${k}.places.${p}`).toUpperCase(), 'small-caps', strip, 'start')
      for (let j = 0; j < 4 - i; j++) el('circle', { cx: x + 44 + j * 9, cy: 156, r: 4, class: 'coin c2' }, strip)
      if (i === 4) text(x + 46, 161, '0', 'small-caps', strip, 'start')
    })
    await this.how(k)
    await this.bet(this.rowPoints())
    this.setCaption(this.t(`${k}.rule`))
    await this.beat(500)
    const throws: Promise<void>[] = []
    this.voters.forEach((v) => {
      let j = 0
      for (const { c, n } of bordaCoins(v.ranking)) {
        for (let i = 0; i < n; i++) {
          throws.push(coin({ x: v.home.x, y: v.home.y - v.r }, c, v.g * 900 + v.k * 55 + j++ * 30, 720, () => {
            pts[c]++
            show(c)
          }))
        }
      }
    })
    await Promise.all(throws)
    strip.remove()
    const outcome = this.o.data.honest.borda
    const totals = tallies(outcome)
    totals.forEach((p, c) => {
      pts[c] = p
      show(c)
    })
    const w = outcome.winner
    await this.crownJar(pts)
    const second = runnerUp(totals, w)
    const fans = PERSONAS.filter((p) => p.ranking[0] === w).reduce((n, p) => n + p.voters, 0)
    this.setCaption(this.t(`${k}.result`, { winner: NAME[w], votes: totals[w], next: second.votes, runner: NAME[second.c], fans }))
    this.settle('borda')
    this.react(w)
  }

  // ---- Burying.
  private async sBury() {
    this.crowdLayout({ ballots: false })
    const { pts, show, coin } = this.buildJars()
    const before = tallies(this.o.data.honest.borda)
    before.forEach((p, c) => {
      pts[c] = p
      show(c)
    })
    void this.crownJar(pts, true)
    const k = 'deck.bury'
    this.words(this.t(`${k}.title`), this.t(`${k}.caption`))
    this.think(ROBINSON, k)
    await this.tap()
    this.unpanel()
    this.groupStamp(ROBINSON, this.t(`${k}.stamp`))
    await this.beat(500)
    // The points that change hands, as the server counts them.
    const after = tallies(this.o.data.bury)
    const loser = after.findIndex((p, c) => p < before[c])
    const gains = after.map((p, c) => Math.max(0, p - before[c]))
    this.float(COLX[loser] + 46, JAR_TOP - 10, loser, after[loser] - before[loser])
    const flights: Promise<void>[] = []
    gains.forEach((n, c) => {
      for (let j = 0; j < n; j++) {
        flights.push(
          coin({ x: COLX[loser], y: BASE - 6 - pts[loser] * PX }, c, flights.length * 120, 820, () => {
            pts[loser]--
            pts[c]++
            show(loser)
            show(c)
          }),
        )
      }
    })
    await Promise.all(flights)
    gains.forEach((n, c) => n && this.float(COLX[c] + 46, JAR_TOP - 10, c, n))
    const w = this.o.data.bury.winner
    await this.crownJar(pts)
    this.setCaption(this.t(`${k}.result`, { winner: NAME[w], votes: after[w], next: runnerUp(after, w).votes, n: PERSONAS[ROBINSON].voters }))
    this.react(w)
    await this.lesson(k)
  }

  // ---- 5. Head to head.
  private async sDuels() {
    this.crowdLayout({ ballots: false, cards: false })
    const m = this.layer.machine
    const node = CANDIDATES.map((_, c) => {
      const a = (-90 + 72 * c) * (Math.PI / 180)
      return { x: 640 + 78 * Math.cos(a), y: 250 + 78 * Math.sin(a) }
    })
    const LEFT = { x: 250, y: 410 }
    const RIGHT = { x: 1030, y: 410 }
    const rope = el('line', { x1: LEFT.x + 40, x2: RIGHT.x - 40, y1: LEFT.y, y2: LEFT.y, class: 'rope' }, m)
    const knot = el('circle', { cx: 640, cy: LEFT.y, r: 9, class: 'knot' }, m)
    const side = (p: Point) => {
      const g = el('g', { class: 'fade gone' }, m)
      const disc = el('circle', { cx: p.x, cy: p.y, r: 36 }, g)
      const letter = text(p.x, p.y + 10, '', 'letter duel-letter', g)
      const name = text(p.x, p.y + 66, '', 'cand-name', g)
      const score = text(p.x, p.y - 52, '', 'big', g)
      return { g, disc, letter, name, score }
    }
    const left = side(LEFT)
    const right = side(RIGHT)
    const edges = el('g', {}, m)
    const edgeOf = new Map<string, SVGLineElement>()
    const rings = node.map((p, c) => {
      token(p.x, p.y, 16, c, m, 15)
      return el('circle', { cx: p.x, cy: p.y, r: 22, class: 'node-ring gone fade' }, m)
    })
    const k = 'deck.duels'
    this.words(this.t(`${k}.title`), this.t(`${k}.ask`))
    await this.how(k)
    await this.bet(node.map((p) => ({ ...p, r: 16, labelY: p.y + 40 })))
    this.setCaption(this.t(`${k}.rule`))
    const d = this.o.data
    const champ = d.condorcetWinner
    const others = CANDIDATES.map((_, c) => c).filter((c) => c !== champ)
    // The champion's duels first, then every other pair.
    const order: [number, number][] = [
      ...others.map((c): [number, number] => [champ, c]).sort((x, y) => (y[1] === d.condorcetLoser ? 1 : 0) - (x[1] === d.condorcetLoser ? 1 : 0)),
      ...others.flatMap((a, i) => others.slice(i + 1).map((b): [number, number] => [a, b])),
    ]
    await this.beat(500)
    for (const [i, [a, c]] of order.entries()) {
      // The champion's duels at a walk, the others at a run.
      const auto = i >= others.length
      this.layer.labels.classList.add('gone')
      for (const [s, cand] of [[left, a], [right, c]] as const) {
        s.g.classList.remove('gone')
        s.disc.setAttribute('class', 'c' + cand)
        s.letter.textContent = LETTER[cand]
        s.letter.setAttribute('class', 'letter duel-letter ' + onClass(cand))
        s.name.textContent = NAME[cand]
        s.score.textContent = '0'
      }
      rings.forEach((r, i) => r.classList.toggle('gone', i !== a && i !== c))
      let na = 0
      let nc = 0
      const lefts = this.voters.filter((v) => prefers(v.ranking, a, c))
      const rights = this.voters.filter((v) => !lefts.includes(v))
      const dur = auto ? 420 : 760
      const go = (list: Voter[], isLeft: boolean) =>
        list.map((v, i) => {
          const to = { x: isLeft ? 70 + (i % 14) * 38 : 1210 - (i % 14) * 38, y: 578 + Math.floor(i / 14) * 44 }
          return this.move(v, to, 1, dur, i * (auto ? 10 : 24), 5).then(() => {
            if (isLeft) left.score.textContent = String(++na)
            else right.score.textContent = String(++nc)
            knot.setAttribute('cx', String(640 + ((nc - na) / TOTAL) * 340))
          })
        })
      await Promise.all([...go(lefts, true), ...go(rights, false)])
      // The server's pairwise counts decide the duel.
      const [w, l] = d.matrix[a][c] > d.matrix[c][a] ? [a, c] : [c, a]
      const p = node[w]
      const q = node[l]
      const len = Math.hypot(q.x - p.x, q.y - p.y)
      const ux = (q.x - p.x) / len
      const uy = (q.y - p.y) / len
      const line = el('line', { x1: p.x + ux * 19, y1: p.y + uy * 19, x2: q.x - ux * 24, y2: q.y - uy * 24, class: 'edge', 'marker-end': 'url(#stage-arrow)' }, edges)
      line.setAttribute('stroke-dasharray', String(len - 43))
      edgeOf.set(`${w}>${l}`, line)
      this.setCaption(this.t(`${k}.beats`, { winner: NAME[w], loser: NAME[l], votes: d.matrix[w][l], next: d.matrix[l][w] }))
      await this.anim.animate(auto ? 260 : 420, (t) => line.setAttribute('stroke-dashoffset', String((len - 43) * (1 - easeOut(t)))))
      await this.beat(auto ? 360 : 600)
    }
    rings.forEach((r) => r.classList.add('gone'))
    left.g.classList.add('gone')
    right.g.classList.add('gone')
    rope.remove()
    knot.remove()
    await Promise.all(this.voters.map((v, i) => this.move(v, v.home, 1, 700, i * 12, 5)))
    this.layer.labels.classList.remove('gone')
    this.layer.cards.classList.remove('gone')
    await this.crownAt(node[champ].x, node[champ].y - 40)
    // Below the champion, majorities may go round in a circle.
    const [x, y, z] = d.cycle
    const circle = d.cycle.length === 3 ? { a: NAME[x], b: NAME[y], c: NAME[z] } : null
    d.cycle.forEach((c, i) => edgeOf.get(`${c}>${d.cycle[(i + 1) % d.cycle.length]}`)?.classList.add('cycle'))
    const result = this.t(`${k}.result`, { winner: NAME[champ] })
    this.setCaption(circle ? `${result} ${this.t(`${k}.cycle`, circle)}` : result)
    this.settle('duels')
    this.react(champ)
    const rivals = CANDIDATES.length - 1
    const flip = (c: number) => node[c].x >= 640
    this.note(node[champ].x + (flip(champ) ? 34 : -34), node[champ].y + 5, this.t(`${k}.beatsAll`, { n: rivals }), flip(champ) ? 'start' : 'end')
    const lost = d.condorcetLoser
    if (lost >= 0) this.note(node[lost].x + (flip(lost) ? 34 : -34), node[lost].y + 5, this.t(`${k}.losesAll`, { n: rivals }), flip(lost) ? 'start' : 'end')
    this.stamp(640, 410, this.t(`${k}.stamp`), this.t('deck.named', { name: NAME[champ], stamp: this.t(`${k}.stamp`) }))
    await this.lesson(k, { winner: NAME[champ], ...(circle ?? { a: '', b: '', c: '' }) })
  }

  // ---- 6. Approval: the reader ticks a ballot too, then the bullet vote.

  /** The reader ticks or unticks candidates; resolves with the ticks when the reader votes. */
  private tickBallot(): Promise<boolean[]> {
    const my = this.gen
    const ticks = CANDIDATES.map(() => false)
    const picks = this.layer.picks
    picks.replaceChildren()
    const hits = CANDIDATES.map((_, c) => {
      const x = COLX[c]
      el('circle', { cx: x, cy: TOKEN_Y, r: 23, class: 'pulse' }, picks)
      const ring = el('circle', { cx: x, cy: TOKEN_Y, r: 27, class: 'ring' }, picks)
      const badge = el('g', { class: 'gone' }, picks)
      el('circle', { cx: x + 19, cy: TOKEN_Y - 19, r: 11, class: 'tick-badge' }, badge)
      text(x + 19, TOKEN_Y - 14.5, '✓', 'tick-mark', badge)
      const hit = el('circle', { cx: x, cy: TOKEN_Y, r: 30, class: 'hit' }, picks)
      asButton(hit, this.t('deck.approval.tick', { name: NAME[c] }), () => {
        if (my !== this.gen) return
        ticks[c] = !ticks[c]
        ring.setAttribute('class', 'ring' + (ticks[c] ? ' ticked' : ''))
        badge.classList.toggle('gone', !ticks[c])
        hit.setAttribute('aria-pressed', String(ticks[c]))
      })
      hit.setAttribute('aria-pressed', 'false')
      return hit
    })
    // The focus goes to the first candidate rather than to Vote.
    const first = document.activeElement === this.title
    const voted = this.ask([{ label: this.t('deck.approval.vote'), primary: true, glyphs: { after: '▶' } }])
    if (first) hits[0].focus({ preventScroll: true })
    return voted.then(() => {
      // The ticks stay on the tokens as the reader's ballot.
      picks.querySelectorAll('.pulse, .hit').forEach((e) => e.remove())
      return ticks
    })
  }

  private async sApproval() {
    this.crowdLayout()
    this.voters.forEach((v) => v.ballot.g.classList.add('gone'))
    this.buildPiles(false)
    const k = 'deck.approval'
    this.words(this.t(`${k}.title`), this.t(`${k}.yours`))
    await this.how(k)
    const yours = await this.tickBallot()
    const counted = this.o.approvalWith(yours)
    this.groups.forEach((g) => [0, 1].forEach((i) => text(g.cx - 48 + i * 23, 548, '✓', 'small-caps', this.layer.notes)))
    this.setCaption(this.t(`${k}.ask`))
    await this.bet(this.rowPoints())
    this.setCaption(this.t(`${k}.rule`))
    await this.beat(500)
    let results: { honest: Outcome; bullet: Outcome }
    try {
      results = await counted
    } catch (e) {
      this.setCaption(this.t('common.apiError', { error: e instanceof Error ? e.message : String(e) }))
      return
    }
    const ticks: [Item, number][] = []
    this.voters.forEach((v) => {
      for (const c of v.ranking.slice(0, 2)) {
        const item = this.makeItem(v)
        item.g.classList.add('extra')
        this.paint(item, c)
        ticks.push([item, c])
      }
    })
    // The reader's ticks leave from the tokens, last.
    const reader = { g: PERSONAS.length, k: 0, r: 0, home: { x: 0, y: 0 }, ranking: [] } as unknown as Voter
    yours.forEach((on, c) => {
      if (!on) return
      const item = this.makeItem({ ...reader, home: { x: COLX[c] + 19, y: TOKEN_Y - 19 } })
      item.g.classList.add('extra', 'mine')
      this.paint(item, c)
      ticks.push([item, c])
    })
    await this.dropAll(ticks, false)
    const honest = results.honest
    const w = honest.winner
    await this.crownPile(w)
    this.setCaption(this.t(yours.some(Boolean) ? `${k}.resultYours` : `${k}.result`, { winner: NAME[w], votes: tallies(honest)[w] }))
    this.settle('approval', w)
    this.react(w)
    // Lucas's group thinks about ticking its favourite alone.
    await this.tap()
    this.setCaption(this.t(`${k}.what`))
    this.think(LUCAS, k)
    await this.tap()
    this.unpanel()
    // Lucas's group takes back every tick but its favourite's; the piles settle.
    const favourite = PERSONAS[LUCAS].ranking[0]
    for (const c of CANDIDATES.keys()) {
      if (c === favourite) continue
      const mine = this.stacks[c].filter((item) => item.v.g === LUCAS)
      if (!mine.length) continue
      this.stacks[c] = this.stacks[c].filter((item) => item.v.g !== LUCAS)
      this.landed[c] = this.stacks[c].length
      this.land(c, 0)
      await Promise.all(mine.map((item, i) => this.fly(item, this.hand(item.v), { dur: 600, delay: i * 60, lift: 50, s1: 0.36, rot1: -16 }).then(() => item.g.remove())))
      await Promise.all(this.stacks[c].map((item, i) => this.fly(item, this.slot(c, i), { dur: 360, lift: 0 })))
      this.float(COLX[c] + 40, this.pileTop(c) - 4, c, -mine.length)
    }
    const after = results.bullet
    const w2 = after.winner
    await this.crownPile(w2)
    this.setCaption(this.t(`${k}.backfire`, { winner: NAME[w2], votes: tallies(after)[w2] }))
    this.react(w2, false)
    this.say(LUCAS, this.t(`${k}.after`))
    this.groupStamp(LUCAS, this.t(`${k}.stamp`), 'bad')
    await this.lesson(k)
  }

  // ---- Same voters, six counts.
  private async sSummary() {
    this.crowdLayout({ ballots: false })
    SYSTEMS.forEach((_, i) => (memory.known[i] = true))
    const winners = SYSTEMS.map((s) => this.winnerOf(s))
    const score = memory.bets.filter((b) => b === true).length
    const placed = memory.bets.filter((b) => b !== null).length
    const k = 'deck.summary'
    const arrow = this.t(`${k}.arrow`)
    this.words(this.t(`${k}.title`, { n: new Set(winners).size }), placed ? `${this.t(`${k}.called`, { score, total: placed })} ${arrow}` : arrow)
    SYSTEMS.forEach((s, i) => {
      const g = el('g', { class: 'pop' }, this.layer.machine)
      g.style.animationDelay = i * 0.18 + 's'
      const x = 70 + i * 194
      el('rect', { x, y: 170, width: 174, height: 250, rx: 16, class: 'card' }, g)
      this.cardTitle(x + 87, 208, this.t(`deck.systems.${s}`), g)
      el('path', { class: 'crown', d: CROWN, transform: `translate(${x + 87},250)` }, g)
      token(x + 87, 310, 38, winners[i], g, 30)
      text(x + 87, 380, NAME[winners[i]], 'cand-name big-name', g)
      const b = memory.bets[i]
      if (b !== null) text(x + 87, 406, `${b ? '✓' : '✗'} ${this.t('deck.bet.yours').toUpperCase()}`, 'bet-label ' + (b ? 'good-text' : 'bad-text'), g)
    })
    // Where to go next.
    const links = [
      { label: this.t('app.nav.sandbox'), path: '/sandbox' },
      { label: this.t('app.nav.rigging'), path: '/rigging' },
      { label: this.t('app.nav.lab'), path: '/lab' },
    ]
    const widths = links.map((l) => textWidth(l.label, 17) + 40)
    let x = 640 - (widths.reduce((a, b) => a + b, 0) + 12 * (links.length - 1)) / 2
    links.forEach((l, i) => {
      this.button(this.layer.notes, x, 444, l.label, () => this.o.open(l.path), 'ghost')
      x += widths[i] + 12
    })
  }
}

const CROWN = 'M-16,9 L-16,-5 L-8,2 L0,-12 L8,2 L16,-5 L16,9 Z'

const onClass = (c: number) => (ON_DARK[c] ? 'on-dark' : 'on-light')

function mouthPath(r: number, mood: number) {
  const w = r * 0.42
  const y = r * 0.36
  return `M${-w},${y} Q0,${y + mood * r * 0.17} ${w},${y}`
}

function token(x: number, y: number, r: number, c: number, parent: Element, size: number) {
  const g = el('g', {}, parent)
  el('circle', { cx: x, cy: y, r, class: 'c' + c }, g)
  // Two letters (Ma, Me) set a little smaller than one, to stay inside the disc.
  const fit = LETTER[c].length > 1 ? size * 0.8 : size
  const t = text(x, y + fit * 0.36, LETTER[c], 'letter ' + onClass(c), g)
  t.style.fontSize = fit + 'px'
  return g
}
