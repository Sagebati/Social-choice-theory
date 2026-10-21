// The journey as a full-screen town square, slide after slide. The stage
// draws Riverton's 30 voters and choreographs every count: ballots fly into
// piles, losing piles move on, coins fill jars, the crowd splits for duels.
// Who wins, and by how much, comes from the server (DeckData); which ballot
// goes where follows from the rankings (plan.ts). Every word is a message.
//
// The picture is SVG; the title, caption, bets board, panels and buttons are
// HTML around it, so they keep a readable size whatever the picture's scale.
// Where everything stands depends on the layout (layout.ts).

import { candidateRole, CANDIDATES, PERSONAS } from '../cast'
import { initial } from '../palette'
import type { Outcome } from '../types'
import { Animator, arc, back, ease, easeOut, type Point } from './engine'
import { COMPACT_MIN, compactGroup, GEOMETRY, type Box, type Geometry, type Mode } from './layout'
import { bordaCoins, eliminations, finalists, nextChoice, prefers, runnerUp, tallies, AIDA, LUCAS, PUSH, ROBINSON } from './plan'
import { asButton, el, html, text, textWidth, wrap } from './svg'

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
  /** The wide picture, or the compact one for a phone held upright or sideways. */
  mode: Mode
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
const TOTAL = PERSONAS.reduce((n, p) => n + p.voters, 0)
const MAJORITY = Math.floor(TOTAL / 2) + 1
const SYSTEMS = ['plurality', 'twoRound', 'irv', 'borda', 'duels', 'approval'] as const
// What fades behind a panel (how it works, a tactic thought through, the lesson).
const DIMMED = ['machine', 'notes', 'items', 'coins', 'crownLayer', 'stamps']
// Pictures only: the words that matter are on the cards, the captions and the live region.
const SILENT = ['cards', 'crowd', 'items', 'coins', 'crownLayer']
/** With reduced motion nothing moves, so a pause between two steps is all the time there is to read. */
const READ = 1800
/** A rough width, in the picture's units, of one 13-unit capital in the small caps. */
const CAP = 9.4
type System = (typeof SYSTEMS)[number]
type Kind = 'primary' | 'ghost' | ''
type Anchor = 'start' | 'middle' | 'end'
/** A decorative arrow either side of a button's words; screen readers hear the words alone. */
type Glyphs = { before?: string; after?: string }

interface Button {
  el: HTMLButtonElement
  draw: (label: string, kind?: Kind, glyphs?: Glyphs) => void
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
  /** The centres of the group's ballot squares, favourite first. */
  cards: number[]
  /** Under the ballot squares, where approval's ticks go. */
  checkY: number
  /** Over the group, where its tactic is stamped. */
  stampY: number
}

/** Where a speech bubble went, so the next one keeps clear of it. */
interface Spot {
  x: number
  y: number
  w: number
  h: number
}

// Bets survive leaving the journey and coming back, until "Start over".
const memory = {
  bets: SYSTEMS.map(() => null as boolean | null),
  known: SYSTEMS.map(() => false),
}

export class TownStage {
  static readonly SLIDES = 14

  private readonly g: Geometry
  private readonly anim: Animator
  private readonly t: Translate
  private readonly svg: SVGSVGElement
  private readonly scene: HTMLDivElement
  private readonly layer: Record<string, SVGGElement> = {}
  private readonly voters: Voter[] = []
  private readonly groups: Group[] = []
  private readonly spokes: Voter[] = []
  private readonly title: HTMLHeadingElement
  private readonly caption: HTMLParagraphElement
  private readonly hud: HTMLDivElement
  /** The panel: how it works, a tactic thought through, the lesson. */
  private readonly thought: HTMLDivElement
  /** Continue, or the choices of the moment, bottom right. */
  private readonly choices: HTMLDivElement
  /** Where to go once the journey is over. */
  private readonly links: HTMLDivElement
  private readonly progress: HTMLParagraphElement
  private readonly crown: SVGGElement
  private readonly ground: SVGRectElement
  private crownPos: Point | null = null
  private readonly blink: number
  private readonly hiddenCards = new Set<number>()
  /** The reader's bet: a ring round the token, and "your bet" under it or, on the compact stage, a badge on it once settled. */
  private betMark: { c: number; ring: SVGCircleElement; label: SVGTextElement; at: Point & { r: number } } | null = null
  // Back, Skip (or Start over) and the slide dots stay from slide to slide, so the focus stays on them.
  private readonly back: Button
  private readonly corner: Button
  private readonly dots: HTMLButtonElement[] = []
  private readonly resize: ResizeObserver
  /** CSS pixels to the picture's unit, and where the picture starts in the scene. */
  private frame = { u: 1, ox: 0, oy: 0 }
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
    private readonly root: HTMLElement,
    private readonly o: StageOptions,
  ) {
    const g = (this.g = GEOMETRY[o.mode])
    this.anim = new Animator(o.reducedMotion)
    this.t = o.t
    root.replaceChildren()
    root.className = `stage ${g.compact ? 'compact' : 'wide'} ${g.mode}`
    // The compact picture is never drawn so small that its words drop under 12px; the deck scrolls instead.
    root.style.setProperty('--scene-min', `${Math.ceil(g.h * COMPACT_MIN)}px`)

    // The title is where the focus waits while the controls it was on are redrawn.
    this.title = html('h1', 'stage-title', root)
    this.title.tabIndex = -1
    this.caption = html('p', 'stage-caption', root)
    this.hud = html('div', 'hud', root)
    this.hud.setAttribute('role', 'img')
    this.scene = html('div', 'scene', root)
    const svg = (this.svg = el('svg', { class: 'town-stage' + (g.compact ? ' compact' : ''), viewBox: `0 0 ${g.w} ${g.h}`, preserveAspectRatio: 'xMidYMid meet', role: 'group' }, this.scene))
    this.thought = html('div', 'thought', this.scene)
    this.thought.hidden = true
    this.links = html('div', 'links', this.scene)
    const bar = html('div', 'bar', root)
    this.back = this.makeButton(bar, 'back')
    const dots = html('div', 'dots', bar)
    dots.setAttribute('role', 'toolbar')
    this.progress = html('p', 'progress', bar)
    this.choices = html('div', 'choices', bar)
    this.corner = this.makeButton(root, 'corner')

    const defs = el('defs', {}, svg)
    const marker = el('marker', { id: 'stage-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs)
    el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' }, marker)
    this.ground = el('rect', { class: 'ground fade', x: g.ground.x, y: g.ground.y, width: g.ground.w, height: g.ground.h }, svg)
    const faded = new Set(['cards', 'labels', ...DIMMED])
    for (const id of ['machine', 'notes', 'cards', 'crowd', 'labels', 'items', 'coins', 'crownLayer', 'stamps', 'bubbles', 'thought', 'picks']) {
      this.layer[id] = el('g', faded.has(id) ? { class: 'fade' } : {}, svg)
    }
    SILENT.forEach((id) => this.layer[id].setAttribute('aria-hidden', 'true'))
    this.layer.thought.setAttribute('aria-hidden', 'true')
    this.buildDots(dots)
    this.buildCrowd()
    // Like a slide: a click anywhere but on a control goes on.
    root.addEventListener('click', (e) => {
      if (!(e.target as Element).closest('button, .hit')) this.advance()
    })
    this.crown = el('g', { class: 'gone fade' }, this.layer.crownLayer)
    el('path', { class: 'crown', d: CROWN }, this.crown)
    this.blink = window.setInterval(() => {
      if (this.anim.reduced) return
      const v = this.voters[Math.floor(Math.random() * this.voters.length)]
      v.node.classList.add('blink')
      window.setTimeout(() => v.node.classList.remove('blink'), 240)
    }, 650)

    // Over the wide picture, the words and buttons sit where they always have.
    if (!g.compact) {
      this.at(this.title, 48, 34)
      this.at(this.caption, 48, 84)
      this.at(this.hud, 1022, 72)
      this.at(this.choices, 1240, 672, 'end')
      this.at(dots, 640, 670, 'middle')
      this.at(this.back.el, 40, 672)
      this.at(this.corner.el, 1240, 30, 'end')
    }
    // The links at the end: under the cards, or on the compact stage where the crowd stood.
    if (g.compact) {
      this.at(this.links, g.crowd.x + g.crowd.w / 2, g.crowd.y + 24, 'middle')
      this.links.style.width = `calc(var(--u) * ${g.crowd.w - 16})`
    } else this.at(this.links, 640, 444, 'middle')
    this.at(this.thought, g.panel.x, g.panel.y)
    this.thought.style.width = `calc(var(--u) * ${g.panel.w})`
    if (Number.isFinite(g.panel.h)) this.thought.style.maxHeight = `calc(var(--u) * ${g.panel.h})`
    this.resize = new ResizeObserver(this.fit)
    this.resize.observe(this.scene)
    window.addEventListener('resize', this.fit)
    this.fit()
  }

  /** Shows slide i (0-based) from its start. */
  show(i: number) {
    const focused = this.root.contains(document.activeElement)
    this.reset()
    this.current = Math.max(0, Math.min(TownStage.SLIDES - 1, i))
    this.svg.setAttribute('aria-label', this.t('deck.aria'))
    this.hud.hidden = this.current < 3 || this.current === TownStage.SLIDES - 1
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
    this.resize.disconnect()
    window.removeEventListener('resize', this.fit)
    window.clearInterval(this.blink)
    window.clearTimeout(this.hearing)
    this.root.replaceChildren()
  }

  private get compact() {
    return this.g.compact
  }

  // ---- The frame: the words and buttons follow the picture's scale.

  private fit = () => {
    const { width, height } = this.scene.getBoundingClientRect()
    if (!width || !height) return
    const u = Math.min(width / this.g.w, height / this.g.h)
    this.frame = { u, ox: (width - this.g.w * u) / 2, oy: (height - this.g.h * u) / 2 }
    for (const [k, v] of Object.entries(this.frame)) this.root.style.setProperty('--' + k, v + 'px')
  }

  /** Places an HTML element over the picture at (x, y) in its units; `anchor` says which of its edges is at x. */
  private at(e: HTMLElement, x: number, y: number, anchor: Anchor = 'start') {
    e.style.left = `calc(var(--ox) + var(--u) * ${x})`
    e.style.top = `calc(var(--oy) + var(--u) * ${y})`
    e.style.translate = { start: '', middle: '-50% 0', end: '-100% 0' }[anchor]
  }

  // ---- The crowd: five groups, each led by its spokesperson.

  /** Where each group stands in the wide picture: side by side, as wide as it is big. */
  private wideGroups() {
    const pitch = 34
    const widths = PERSONAS.map((p) => 60 + Math.ceil((p.voters - 1) / 2) * pitch)
    const gap = (1180 - widths.reduce((a, b) => a + b, 0)) / (PERSONAS.length - 1)
    let x = 50
    return PERSONAS.map((p, gi) => {
      const w = widths[gi]
      const spot = { x, w, cx: x + w / 2, labelY: 660, cardY: 510, cardPitch: 23, card: 20, homes: [] as Point[] }
      for (let k = 0; k < p.voters; k++) {
        const m = k - 1
        spot.homes.push(k === 0 ? { x: x + 24, y: 596 } : { x: x + 64 + Math.floor(m / 2) * pitch, y: 578 + (m % 2) * 38 })
      }
      x += w + gap
      return spot
    })
  }

  private buildCrowd() {
    const g = this.g
    const wide = g.compact ? null : this.wideGroups()
    PERSONAS.forEach((p, gi) => {
      const spot = wide ? wide[gi] : compactGroup(g, gi)
      const first = spot.cx - (4 * spot.cardPitch + spot.card) / 2 - (wide ? 2 : 0)
      const cards = p.ranking.map((_, i) => first + i * spot.cardPitch + spot.card / 2)
      const group: Group = {
        x: spot.x,
        w: spot.w,
        cx: spot.cx,
        card: el('g', {}, this.layer.cards),
        cards,
        checkY: spot.cardY + spot.card + (wide ? 18 : 16),
        stampY: wide ? 604 : spot.homes[0].y,
      }
      this.groups.push(group)
      spot.homes.forEach((home, k) => {
        const spoke = k === 0
        const v = { g: gi, k, spoke, home, r: spoke ? g.head.spoke : g.head.voter, ranking: p.ranking, pos: { ...home }, s: 1, mood: 0 } as Voter
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
      })
      const label = el('text', { x: spot.cx, y: spot.labelY, 'text-anchor': 'middle' }, this.layer.labels)
      el('tspan', { class: 'group-name' }, label).textContent = p.name
      el('tspan', { class: 'group-n', dx: g.compact ? 4 : 6 }, label).textContent = '×' + p.voters
      // The group's ballot stays in view: its ranking, favourite first.
      p.ranking.forEach((c, i) => {
        const x = cards[i] - spot.card / 2
        el('rect', { x, y: spot.cardY, width: spot.card, height: spot.card, rx: 4, class: 'card-sq c' + c }, group.card)
        const letter = text(x + spot.card / 2, spot.cardY + (g.compact ? 14.5 : 14), LETTER[c], 'letter tiny ' + onClass(c), group.card)
        if (g.compact) letter.style.fontSize = '13px'
        else if (LETTER[c].length > 1) letter.style.fontSize = '9.5px'
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
    this.ground.classList.remove('gone')
    this.voters.forEach((v) => this.setNode(v, v.home.x, v.home.y, 1))
    this.layer.items.classList.toggle('gone', !ballots)
    this.layer.cards.classList.toggle('gone', !cards)
    this.layer.labels.classList.remove('gone')
  }

  /** Where spokesperson gi stands to introduce themself, and how big. */
  private personaAt(gi: number) {
    if (!this.compact) return { x: this.g.colx[gi], y: 196, s: 1.9 }
    const r = this.g.rows[gi]
    return { x: r.x + 30, y: r.y + 30, s: 1.7 }
  }

  /** On the compact stage the rows of faces run over where the crowd stands, so its ground goes. */
  private noGround() {
    this.ground.classList.toggle('gone', this.compact)
  }

  private personaLayout() {
    this.noGround()
    this.voters.forEach((v) => {
      const p = this.personaAt(v.g)
      if (v.spoke) this.setNode(v, p.x, p.y, p.s)
      else this.setNode(v, v.home.x, v.home.y, 0)
    })
    for (const id of ['items', 'cards', 'labels']) this.layer[id].classList.add('gone')
  }

  private emptyLayout() {
    this.noGround()
    this.voters.forEach((v) => this.setNode(v, v.home.x, v.home.y, 0))
    for (const id of ['items', 'cards', 'labels']) this.layer[id].classList.add('gone')
  }

  // ---- Ballots and ticks.

  private makeItem(v: Voter): Item {
    const { w, h } = this.g.item
    const g = el('g', { class: 'item' }, this.layer.items)
    const item: Item = { g, rect: el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 2 }, g), v, x: 0, y: 0, s: 1, rot: 0 }
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

  // ---- Words.

  private words(title: string, caption = '') {
    this.title.textContent = title
    this.setCaption(caption, false)
    if (title) {
      this.tell(caption ? `${title}. ${caption}` : title)
      this.o.heading(title)
    }
  }

  private setCaption(caption: string, announce = true) {
    this.caption.textContent = caption
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

  /** A new control for the reader: the focus moves to it if it was waiting on the title (and, on a phone, into view). */
  private offer(control: HTMLElement | SVGElement) {
    if (document.activeElement === this.title) control.focus({ preventScroll: !this.compact })
  }

  private showing(e: Element | null) {
    return !!e && this.root.contains(e) && !e.closest('[hidden]') && e.getClientRects().length > 0
  }

  private clearBubbles() {
    this.layer.bubbles.replaceChildren()
    this.hiddenCards.forEach((gi) => this.groups[gi].card.classList.remove('gone'))
    this.hiddenCards.clear()
  }

  /** A speech bubble over spokesperson gi, clear of the bubbles already `placed`. */
  private say(gi: number, line: string, placed: Spot[] = []): Spot {
    const v = this.spokes[gi]
    const W = this.g.w
    const head = v.pos.y - v.r * v.s
    // On the compact stage a bubble may run to a few lines, and stack over another.
    const lines = this.compact ? wrap(line, 28) : [line]
    const w = this.compact ? Math.min(250, 26 + Math.max(...lines.map((l) => textWidth(l, 14))) * 0.95) : Math.min(420, 26 + textWidth(line, 15) * 0.95)
    const h = this.compact ? 14 + lines.length * 18 : 34
    // Over the head, unless the picture ends there (the front groups, sideways): then under it.
    const foot = v.pos.y + v.r * v.s
    const below = this.compact && head - h - 10 < 4
    let x = Math.max(8, Math.min(W - 8 - w, v.pos.x - w / 2))
    let y = below ? foot + 10 : head - h - 10
    for (const o of placed) {
      if (!(x < o.x + o.w + 8 && x + w + 8 > o.x)) continue
      if (o.x + o.w + 10 <= W - 8 - w) x = o.x + o.w + 10
      else if (!this.compact) x = Math.max(8, o.x - w - 10)
      else if (o.x - w - 10 >= 8) x = o.x - w - 10
      else y = below ? Math.max(y, o.y + o.h + 8) : Math.min(y, o.y - h - 8)
    }
    this.groups[gi].card.classList.add('gone')
    this.hiddenCards.add(gi)
    const g = el('g', { class: 'bubble' }, this.layer.bubbles)
    el('rect', { x, y, width: w, height: h, rx: 11 }, g)
    const tail = Math.max(x + 14, Math.min(x + w - 14, v.pos.x))
    const [edge, tip] = below ? [y + 1, Math.min(y - 9, foot + 1)] : [y + h - 1, Math.max(y + h + 9, head - 1)]
    el('path', { d: `M${tail - 7},${edge} L${v.pos.x},${tip} L${tail + 7},${edge}Z` }, g)
    lines.forEach((l, i) => text(x + w / 2, y + (this.compact ? 21 + i * 18 : 22), l, '', g))
    this.tell(this.t('deck.says', { name: PERSONAS[gi].name, line }))
    return { x, y, w, h }
  }

  /**
   * A panel over the dimmed scene: how a system works, a spokesperson thinking
   * a tactic through, or what went wrong and what Riverton tries next.
   * With `thinker`, a trail of little clouds leads to that spokesperson.
   */
  private panel(eyebrow: string, parts: { title?: string; body: string; numbered?: boolean; lead?: boolean }[], thinker?: number) {
    this.clearBubbles()
    this.layer.thought.replaceChildren()
    DIMMED.forEach((id) => this.layer[id].classList.add('dim'))
    const box = this.thought
    box.replaceChildren()
    html('p', 'eyebrow', box).textContent = eyebrow
    for (const part of parts) {
      const section = html('div', 'part', box)
      if (part.title) html('p', 'name', section).textContent = part.title
      const kind = part.lead ? 'lead' : 'def'
      const steps = part.body.split('\n')
      if (part.numbered) {
        const list = html('ol', kind, section)
        steps.forEach((step) => (html('li', '', list).textContent = step))
      } else steps.forEach((step) => (html('p', kind, section).textContent = step))
    }
    // It pops up afresh each time.
    box.classList.remove('pop')
    box.hidden = false
    void box.offsetWidth
    box.classList.add('pop')
    box.scrollTop = 0
    if (thinker !== undefined) {
      const v = this.spokes[thinker]
      this.groups[thinker].card.classList.add('gone')
      this.hiddenCards.add(thinker)
      // The panel's edges, in the picture's units.
      const { u, ox, oy } = this.frame
      const left = (box.offsetLeft - ox) / u
      const right = left + box.offsetWidth / u
      const from = { x: Math.max(left + 50, Math.min(right - 50, v.pos.x)), y: (box.offsetTop - oy + box.offsetHeight) / u + 16 }
      const to = { x: v.pos.x, y: v.pos.y - v.r * v.s - 12 }
      // Only if there is room between the panel and the thinker.
      if (to.y - from.y > 24) {
        for (const [f, r] of [[0, 11], [0.45, 8], [0.8, 5]]) {
          el('circle', { cx: from.x + (to.x - from.x) * f, cy: from.y + (to.y - from.y) * f, r: this.compact ? r * 0.7 : r, class: 'thought-dot' }, this.layer.thought)
        }
      }
    }
    this.tell([eyebrow, ...parts.map((p) => (p.title ? `${p.title}: ${p.body}` : p.body))].join(' ').replace(/\n/g, ' '))
  }

  private unpanel() {
    this.release(this.thought)
    this.thought.hidden = true
    this.thought.replaceChildren()
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
    const placed: Spot[] = []
    const best = PERSONAS.findIndex((p) => p.ranking[0] === winner)
    const worst = PERSONAS.findIndex((p) => p.ranking[p.ranking.length - 1] === winner)
    if (best >= 0) placed.push(this.say(best, this.voice(best, 'best'), placed))
    if (worst >= 0) placed.push(this.say(worst, this.voice(worst, 'worst'), placed))
  }

  /** A stamp, and what a screen reader hears of it. */
  private stamp(x: number, y: number, label: string, heard: string, tone = '') {
    const size = this.compact ? 14 : 16
    const w = textWidth(label, size) * 1.12 + (this.compact ? 22 : 28)
    const h = this.compact ? 28 : 34
    // A long stamp over an outer group stays inside the picture.
    x = Math.max(w / 2 + 4, Math.min(this.g.w - w / 2 - 4, x))
    const g = el('g', { class: 'stamp ' + tone, 'aria-hidden': 'true' }, this.layer.stamps)
    const inner = el('g', { transform: `translate(${x},${y}) rotate(-7)` }, g)
    el('rect', { x: -w / 2, y: -h / 2 - 1, width: w, height: h, rx: 6 }, inner)
    text(0, size * 0.36, label.toUpperCase(), '', inner)
    this.tell(heard)
  }

  /** A group's tactic, stamped over it. */
  private groupStamp(gi: number, label: string, tone = '') {
    const group = this.groups[gi]
    this.stamp(group.cx, group.stampY, label, this.t('deck.groupStamp', { name: PERSONAS[gi].name, stamp: label }), tone)
  }

  /** Small capitals; on the compact stage, wrapped to `width` units and stacked upwards from y. */
  private note(x: number, y: number, s: string, anchor: Anchor = 'middle', width = Infinity, parent: SVGGElement = this.layer.notes, cls = 'pop') {
    const lines = Number.isFinite(width) ? wrap(s.toUpperCase(), Math.max(6, Math.floor(width / CAP))) : [s.toUpperCase()]
    return lines.map((line, i) => text(x, y - (lines.length - 1 - i) * 17, line, 'small-caps ' + cls, parent, anchor))
  }

  private bracket(x1: number, x2: number, y: number, label: string) {
    const g = el('g', { class: 'pop' }, this.layer.notes)
    el('path', { class: 'bracket', d: `M${x1},${y + 8} V${y} H${x2} V${y + 8} M${(x1 + x2) / 2},${y} V${y - 6}` }, g)
    this.note((x1 + x2) / 2, y - (this.compact ? 10 : 12), label, 'middle', this.compact ? x2 - x1 + 20 : Infinity, g, '')
  }

  /** Ballots or points gained (n > 0) or lost by candidate c, floating up over its pile or jar, whose top is `top`. */
  private float(c: number, top: number, n: number, dx = 40, dy = -4) {
    const [x, y] = this.compact ? [this.g.colx[c], top - 30] : [this.g.colx[c] + dx, top + dy]
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

  // ---- Buttons.

  private makeButton(parent: HTMLElement, cls = ''): Button {
    let action = () => {}
    const b = html('button', `sbtn ${cls}`, parent)
    b.type = 'button'
    b.addEventListener('click', () => action())
    return {
      el: b,
      draw: (label, kind = '', { before, after } = {}) => {
        b.className = `sbtn ${cls} ${kind}`
        b.replaceChildren(...[before && glyph(before), label, after && glyph(after)].filter((x): x is string | HTMLSpanElement => !!x))
      },
      onPress: (f) => (action = f),
      show: (on) => (b.hidden = !on),
    }
  }

  private button(parent: HTMLElement, label: string, onClick: () => void, kind: Kind = '', glyphs: Glyphs = {}) {
    const b = this.makeButton(parent, 'pop')
    b.onPress(onClick)
    b.draw(label, kind, glyphs)
    return b.el
  }

  /** Waits for the reader: a click anywhere, or →, Space or Enter. A button shows bottom right. */
  private tap(): Promise<void> {
    const my = this.gen
    return new Promise((resolve) => {
      const parent = this.choices
      parent.replaceChildren()
      const done = () => {
        if (my !== this.gen || this.waiting !== done) return
        this.waiting = null
        this.release(parent)
        parent.replaceChildren()
        resolve()
      }
      this.offer(this.button(parent, this.t('deck.next'), done, 'ghost', { after: '▸' }))
      this.waiting = done
    })
  }

  /** Choices, bottom right, where the thumb is. Resolves with the index pressed. */
  private ask(list: { label: string; primary?: boolean; glyphs?: Glyphs }[]): Promise<number> {
    const my = this.gen
    return new Promise((resolve) => {
      const parent = this.choices
      parent.replaceChildren()
      const buttons = list.map(({ label, primary, glyphs }, i) =>
        this.button(parent, label, () => {
          if (my !== this.gen) return
          this.release(parent)
          parent.replaceChildren()
          resolve(i)
        }, primary ? 'primary' : '', glyphs),
      )
      if (buttons.length) this.offer(buttons[0])
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
            label: text(p.x, p.labelY, this.compact ? '' : this.t('deck.bet.yours').toUpperCase(), 'bet-label', g),
            at: p,
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
      if (this.compact) {
        const { x, y, r } = this.betMark.at
        const badge = el('g', { class: 'pop', 'aria-hidden': 'true' }, this.betMark.ring.parentElement!)
        // Top left of the token; a knock-out's cross goes top right.
        el('circle', { cx: x - r, cy: y - r, r: 9, class: 'bet-badge ' + (right ? 'good' : 'bad') }, badge)
        text(x - r, y - r + 4.5, right ? '✓' : '✗', 'out-mark', badge)
        this.betMark.label.remove()
      }
      memory.bets[i] = right
      this.tell(this.t(right ? 'deck.bet.right' : 'deck.bet.wrong', { name: NAME[this.betMark.c] }))
      const placed = memory.bets.filter((b) => b !== null)
      this.tell(this.t('deck.bet.score', { score: placed.filter(Boolean).length, total: placed.length }))
      this.betMark = null
    }
    this.drawHud()
  }

  /** The bets board: each system's winner once known, and whether the reader called it. */
  private drawHud() {
    const hud = this.hud
    hud.replaceChildren()
    html('p', 'hud-label', hud).textContent = this.t('deck.bet.board')
    const said = [this.t('deck.hud.title')]
    SYSTEMS.forEach((s, i) => {
      const system = this.t(`deck.systems.${s}`)
      const cell = html('span', 'cell', hud)
      cell.title = system
      const b = memory.bets[i]
      if (memory.known[i]) {
        const w = this.winnerOf(s)
        cell.classList.add('known')
        if (LETTER[w].length > 1) cell.classList.add('two')
        cell.style.background = `var(--c${w})`
        cell.style.color = `var(--on-c${w})`
        cell.textContent = LETTER[w]
        const how = b === null ? 'won' : b ? 'right' : 'wrong'
        said.push(this.t(`deck.hud.${how}`, { system, winner: NAME[w] }))
      } else {
        cell.textContent = '?'
        said.push(this.t('deck.hud.pending', { system }))
      }
      // Under the cell, or on the compact stage a badge on it.
      if (b !== null) html('span', 'mark ' + (b ? 'good' : 'bad'), cell).textContent = b ? '✓' : '✗'
    })
    hud.setAttribute('aria-label', said.join(' '))
  }

  /**
   * The slide dots, one button each. Like a toolbar, only the current one is in
   * the tab order; ← and → move between them, Enter or Space goes there.
   */
  private buildDots(bar: HTMLElement) {
    for (let i = 0; i < TownStage.SLIDES; i++) {
      const b = html('button', 'dot-btn', bar)
      b.type = 'button'
      html('span', 'dot', b)
      b.addEventListener('click', () => this.o.navigate(i))
      b.addEventListener('keydown', (event) => {
        const to = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: TownStage.SLIDES - 1 }[event.key]
        if (to === undefined) return
        event.preventDefault()
        event.stopPropagation()
        this.dots[Math.max(0, Math.min(TownStage.SLIDES - 1, to))].focus()
      })
      this.dots.push(b)
    }
  }

  /** Back bottom left, the slide dots (or, on a phone, where we are), and Skip (or Start over) top right. */
  private drawNav() {
    const last = this.current === TownStage.SLIDES - 1
    this.back.show(this.current > 0)
    this.back.draw(this.t('deck.back'), 'ghost', { before: '←' })
    this.back.onPress(() => this.o.navigate(this.current - 1))
    if (!last) {
      this.corner.draw(this.t('deck.skip'), 'ghost', { after: '⏭' })
      this.corner.onPress(() => this.o.navigate(this.current + 1))
    } else {
      this.corner.draw(this.t('deck.startOver'), 'primary', { before: '↺' })
      this.corner.onPress(() => {
        memory.bets.fill(null)
        memory.known.fill(false)
        this.o.navigate(0)
      })
    }
    const slide = this.t('deck.slide', { n: this.current + 1, total: TownStage.SLIDES })
    this.dots[0].parentElement?.setAttribute('aria-label', this.t('deck.slides'))
    this.dots.forEach((b, i) => {
      const here = i === this.current
      b.setAttribute('aria-label', this.t('deck.slide', { n: i + 1, total: TownStage.SLIDES }))
      b.tabIndex = here ? 0 : -1
      if (here) b.setAttribute('aria-current', 'step')
      else b.removeAttribute('aria-current')
      b.classList.toggle('here', here)
    })
    const short = html('span')
    short.setAttribute('aria-hidden', 'true')
    short.textContent = `${this.current + 1} / ${TownStage.SLIDES}`
    const full = html('span', 'visually-hidden')
    full.textContent = slide
    this.progress.replaceChildren(short, full)
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

  private slot = (c: number, k: number) => ({ x: this.g.colx[c], y: this.g.base - this.g.step * k - (this.g.item.h / 2 + 1.5) })
  private pileTop = (c: number) => this.g.base - this.g.step * this.landed[c]
  private rowPoints = () => CANDIDATES.map((_, c) => ({ x: this.g.colx[c], y: this.g.token.y, r: this.g.token.r, labelY: this.g.betY }))

  private candidateRow() {
    const { colx, token: tk, base, nameY, stagger } = this.g
    const half = this.compact ? 24 : 36
    return CANDIDATES.map((cand, c) => {
      const g = el('g', {}, this.layer.machine)
      el('line', { x1: colx[c] - half, x2: colx[c] + half, y1: base + 1, y2: base + 1, class: 'baseline' }, g)
      token(colx[c], tk.y, tk.r, c, g, tk.size)
      text(colx[c], nameY + (c % 2) * stagger, cand.name, 'cand-name', g)
      return g
    })
  }

  private buildPiles(majority = true) {
    const { majority: m, base, step } = this.g
    if (majority) {
      const y = base - step * MAJORITY
      el('line', { x1: m.x1, x2: m.x2, y1: y, y2: y, class: 'majority' }, this.layer.machine)
      // On the compact stage the label stands on two lines, left of the first pile.
      const label = this.compact ? this.t('deck.majorityLines', { n: MAJORITY }).split('\n') : [this.t('deck.majority', { n: MAJORITY })]
      label.forEach((line, i) => text(m.labelX, y - 8 - (label.length - 1 - i) * 17, line.toUpperCase(), 'small-caps', this.layer.machine, m.anchor))
    }
    const tokens = this.candidateRow()
    this.cols = CANDIDATES.map((_, c) => ({ token: tokens[c], count: text(this.g.colx[c], base - 12, '', 'count', this.layer.machine) }))
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

  private crownPile = (c: number, instant = false) => this.crownAt(this.g.colx[c], this.pileTop(c) - (this.compact ? 34 : 44), instant)

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
    const x = this.g.colx[c]
    const y = this.g.token.y
    const heard = this.t('deck.isOut', { name: NAME[c] })
    if (!this.compact) return this.stamp(x, y, this.t('deck.out'), heard, 'bad')
    // Too narrow a column for the word: a cross on the token says it.
    const badge = el('g', { class: 'pop', 'aria-hidden': 'true' }, this.layer.stamps)
    el('circle', { cx: x + 16, cy: y - 16, r: 9, class: 'out-badge' }, badge)
    text(x + 16, y - 11.5, '✗', 'out-mark', badge)
    this.tell(heard)
  }

  // ---- Jars of points.

  private buildJars() {
    this.candidateRow()
    const { colx, jar, base } = this.g
    const px = jar.h / 90
    const pts = CANDIDATES.map(() => 0)
    const jars = CANDIDATES.map((_, c) => {
      el('rect', { x: colx[c] - jar.w / 2, y: jar.top, width: jar.w, height: jar.h, rx: this.compact ? 10 : 13, class: 'jar' }, this.layer.machine)
      const fill = el('rect', { x: colx[c] - jar.w / 2 + 2, y: base - 1, width: jar.w - 4, height: 0, rx: this.compact ? 8 : 10, class: 'jar-fill c' + c }, this.layer.machine)
      return { fill, label: text(colx[c], jar.top - 12, '0', 'count', this.layer.machine) }
    })
    const show = (c: number) => {
      const h = Math.min(jar.h - 4, pts[c] * px)
      jars[c].fill.setAttribute('y', String(base - 2 - h))
      jars[c].fill.setAttribute('height', String(h))
      jars[c].label.textContent = String(pts[c])
    }
    const spread = this.compact ? 24 : 34
    const coin = (from: Point, c: number, delay: number, dur: number, onLand: () => void) => {
      const dot = el('circle', { r: this.compact ? 4 : 5.5, class: 'coin c' + c }, this.layer.coins)
      dot.setAttribute('transform', `translate(${from.x},${from.y})`)
      const tx = colx[c] + (((delay * 7) % spread) - spread / 2)
      return this.anim
        .animate(dur, (t) => {
          // Aim at the jar's current level, which rises while the coin is in the air.
          const p = arc(from, { x: tx, y: base - 6 - pts[c] * px }, this.compact ? 60 : 90, ease(t))
          dot.setAttribute('transform', `translate(${p.x},${p.y})`)
        }, delay)
        .then(() => {
          dot.remove()
          onLand()
        })
    }
    return { pts, px, show, coin }
  }

  private crownJar(pts: number[], instant = false) {
    return this.crownAt(this.g.colx[pts.indexOf(Math.max(...pts))], this.g.jar.top - (this.compact ? 36 : 48), instant)
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
    for (const id of ['machine', 'notes', 'coins', 'stamps', 'picks', 'thought']) this.layer[id].replaceChildren()
    this.choices.replaceChildren()
    this.links.replaceChildren()
    this.thought.hidden = true
    this.thought.replaceChildren()
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

  /** How many characters of 13-unit text fit across a compact row, after its picture. */
  private roleChars = (r: Box) => Math.floor((r.w - 70) / 7.3)

  private async sTown() {
    this.emptyLayout()
    this.words(this.t('deck.town.title'), this.t('deck.town.caption'))
    CANDIDATES.forEach((cand, c) => {
      const g = el('g', { class: 'pop' }, this.layer.machine)
      g.style.animationDelay = c * 0.12 + 's'
      if (this.compact) {
        // One row each: the token, the full name, what they do.
        const r = this.g.rows[c]
        token(r.x + 30, r.y + 30, 22, c, g, 20)
        text(r.x + 62, r.y + 26, cand.fullName, 'cand-name big-name', g, 'start')
        wrap(candidateRole(cand), this.roleChars(r)).forEach((line, i) => text(r.x + 62, r.y + 46 + i * 17, line, 'muted role', g, 'start'))
        return
      }
      const x = this.g.colx[c]
      token(x, 290, 48, c, g, 38)
      // First name over surname: the full names are too wide for one line each.
      const [first, ...rest] = cand.fullName.split(' ')
      text(x, 376, first, 'cand-name big-name', g)
      text(x, 402, rest.join(' '), 'cand-name big-name', g)
      wrap(candidateRole(cand), 24).forEach((line, i) => text(x, 430 + i * 20, line, 'muted role', g))
    })
  }

  /** The five spokespeople and their rankings, favourite first. */
  private ladders(parent: SVGGElement, reveal: boolean) {
    PERSONAS.forEach((p, gi) => {
      const head = el('g', { class: reveal ? 'pop' : '' }, parent)
      const role = this.t(`cast.personas.${p.key}.role`)
      if (this.compact) {
        // One row each: the name and the ranking on a line, what they do under it.
        const r = this.g.rows[gi]
        text(r.x + 62, r.y + 26, p.name, 'cand-name big-name', head, 'start')
        wrap(role, this.roleChars(r)).forEach((line, i) => text(r.x + 62, r.y + 46 + i * 17, line, 'muted small-role', head, 'start'))
        p.ranking.forEach((c, i) => {
          const chip = el('g', { class: reveal ? 'pop' : '' }, parent)
          if (reveal) chip.style.animationDelay = gi * 0.15 + i * 0.09 + 's'
          token(r.x + r.w - 18 - (4 - i) * 26, r.y + 21, 11, c, chip, 16.5)
        })
        return
      }
      const x = this.g.colx[gi]
      text(x, 268, p.name, 'cand-name big-name', head)
      wrap(role, 24).forEach((line, i) => text(x, 292 + i * 18, line, 'muted small-role', head))
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
      const at = this.personaAt(gi)
      const r = this.g.rows[gi]
      // A face to tap; on the compact stage, its whole row.
      const hit = this.compact
        ? el('rect', { x: r.x + 2, y: r.y + 2, width: r.w - 4, height: r.h - 4, rx: 14, class: 'hit' }, this.layer.picks)
        : el('circle', { cx: at.x, cy: at.y, r: 48, class: 'hit' }, this.layer.picks)
      asButton(hit, this.t('deck.personas.why', { name: p.name }), () => {
        if (my !== this.gen) return
        this.layer.bubbles.replaceChildren()
        const b = el('g', { class: 'bubble' }, this.layer.bubbles)
        if (this.compact) {
          // Under the row if it fits, else over it; the tail points at the face.
          const w = r.w - 70
          const lines = wrap(this.voice(gi, 'why'), Math.floor((w - 24) / 7.6))
          const h = 14 + lines.length * 18
          const below = r.y + 52 + h <= this.g.h - 4
          const x = r.x + 60
          const y = below ? r.y + 52 : r.y + 8 - h
          el('rect', { x, y, width: w, height: h, rx: 12 }, b)
          const edge = below ? y + 1 : y + h - 1
          el('path', { d: `M${x + 10},${edge} L${at.x + 14},${below ? at.y + 14 : at.y - 14} L${x + 26},${edge}Z` }, b)
          lines.forEach((line, i) => text(x + w / 2, y + 21 + i * 18, line, '', b))
        } else {
          const lines = wrap(this.voice(gi, 'why'), 26)
          const w = 236
          const h = 20 + lines.length * 20
          const x = Math.max(8, Math.min(1272 - w, at.x - w / 2))
          const y = 536
          el('rect', { x, y, width: w, height: h, rx: 12 }, b)
          el('path', { d: `M${at.x - 8},${y + 1} L${at.x},${y - 10} L${at.x + 8},${y + 1}Z` }, b)
          lines.forEach((line, i) => text(x + w / 2, y + 26 + i * 20, line, '', b))
        }
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
    const { board } = this.g
    const cx = this.compact ? board.x + board.w / 2 : 640
    const y = this.compact ? board.y + 150 : 330
    const counter = text(cx, y, String(PERSONAS.length), 'huge gone fade', this.layer.machine)
    const unit = text(cx, y + (this.compact ? 36 : 42), this.t('deck.voters').toUpperCase(), 'small-caps gone fade', this.layer.machine)
    await this.anim.sleep(500)
    lad.classList.add('gone')
    this.ground.classList.remove('gone')
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
    const all = PERSONAS.map((p) => `${p.name} ×${p.voters}`).join(' · ')
    if (this.compact) wrap(all.toUpperCase(), 34).forEach((line, i) => text(cx, y + 64 + i * 18, line, 'small-caps pop', this.layer.notes))
    else this.note(640, 400, all)
  }

  /** The six systems' cards: a row of six, or on the compact stage three by two. */
  private cardBox(i: number, wideY: number, wideH: number): Box {
    if (!this.compact) return { x: 70 + i * 194, y: wideY, w: 174, h: wideH }
    const { board } = this.g
    const h = (board.h - 12) / 2
    return { x: board.x + 4 + (i % 3) * 120, y: board.y + 4 + Math.floor(i / 3) * (h + 4), w: 112, h }
  }

  private async sGame() {
    this.crowdLayout()
    this.words(this.t('deck.game.title'), this.t('deck.game.caption', { n: TOTAL }))
    SYSTEMS.forEach((s, i) => {
      const g = el('g', { class: 'pop' }, this.layer.machine)
      g.style.animationDelay = i * 0.1 + 's'
      const b = this.cardBox(i, 190, 190)
      const cx = b.x + b.w / 2
      el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 16, class: 'card' }, g)
      this.cardTitle(cx, b.y + (this.compact ? 26 : 38), this.t(`deck.systems.${s}`), g)
      const ring = this.compact ? { y: b.y + 41 + 22, r: 22 } : { y: 300, r: 36 }
      el('circle', { cx, cy: ring.y, r: ring.r, class: 'slot-ring' }, g)
      text(cx, ring.y + (this.compact ? 9 : 14), '?', 'big muted', g)
      text(cx, b.y + (this.compact ? b.h - 9 : 172), this.t('deck.bet.yours').toUpperCase(), 'small-caps', g)
    })
  }

  /** A system's name on a card, on two lines when it is too wide for one. */
  private cardTitle(x: number, y: number, name: string, parent: SVGGElement) {
    const [size, room, gap] = this.compact ? [14, 100, 18] : [18, 160, 22]
    const lines = textWidth(name, size) > room ? wrap(name, Math.ceil(name.length / 2)) : [name]
    lines.forEach((line, i) => text(x, y + (i - (lines.length - 1) / 2) * gap, line, 'cand-name', parent))
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
    const others = this.g.colx.filter((_, c) => c !== w)
    const tops = CANDIDATES.map((_, c) => (c === w ? Infinity : this.pileTop(c)))
    const pad = this.compact ? 26 : 40
    this.bracket(Math.min(...others) - pad, Math.max(...others) + pad, Math.min(...tops) - (this.compact ? 26 : 46), this.t(`${k}.others`, { n: TOTAL - votes }))
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
      gains.forEach((n, c) => this.float(c, this.pileTop(c), n))
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

  /** What each place on a ballot is worth: a strip under the caption, or on the compact stage a column left of the jars. */
  private bordaKey() {
    const strip = el('g', { class: 'strip pop' }, this.layer.notes)
    const places = ['first', 'second', 'third', 'fourth', 'last'] as const
    if (this.compact) {
      const { board, jar } = this.g
      const x = board.x
      const step = 20
      el('rect', { x, y: jar.top - 4, width: 80, height: 5 * step + 8, rx: 9 }, strip)
      places.forEach((p, i) => {
        const y = jar.top + 14 + i * step
        text(x + 5, y, this.t(`deck.borda.places.${p}`).toUpperCase(), 'small-caps', strip, 'start')
        for (let j = 0; j < 4 - i; j++) el('circle', { cx: x + 73 - j * 8, cy: y - 4.5, r: 3.5, class: 'coin c2' }, strip)
        if (i === 4) text(x + 77, y, '0', 'small-caps', strip, 'end')
      })
      return strip
    }
    el('rect', { x: 48, y: 140, width: 430, height: 32, rx: 9 }, strip)
    places.forEach((p, i) => {
      const x = 64 + i * 82
      text(x, 161, this.t(`deck.borda.places.${p}`).toUpperCase(), 'small-caps', strip, 'start')
      for (let j = 0; j < 4 - i; j++) el('circle', { cx: x + 44 + j * 9, cy: 156, r: 4, class: 'coin c2' }, strip)
      if (i === 4) text(x + 46, 161, '0', 'small-caps', strip, 'start')
    })
    return strip
  }

  // ---- 4. Borda points.
  private async sBorda() {
    this.crowdLayout({ ballots: false })
    const { pts, show, coin } = this.buildJars()
    const k = 'deck.borda'
    this.words(this.t(`${k}.title`), this.t(`${k}.ask`))
    const strip = this.bordaKey()
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
    const { pts, px, show, coin } = this.buildJars()
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
    const { jar, base, colx } = this.g
    this.float(loser, jar.top, after[loser] - before[loser], 46, -10)
    const flights: Promise<void>[] = []
    gains.forEach((n, c) => {
      for (let j = 0; j < n; j++) {
        flights.push(
          coin({ x: colx[loser], y: base - 6 - pts[loser] * px }, c, flights.length * 120, 820, () => {
            pts[loser]--
            pts[c]++
            show(loser)
            show(c)
          }),
        )
      }
    })
    await Promise.all(flights)
    gains.forEach((n, c) => n && this.float(c, jar.top, n, 46, -10))
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
    const { board, crowd } = this.g
    // The graph of duels above, the tug of war under it.
    const D = this.compact
      ? {
          // Sideways the board is shorter: a smaller graph.
          c: { x: board.x + 180, y: board.y + (board.h > 250 ? 104 : 92) },
          R: board.h > 250 ? 56 : 46,
          left: { x: board.x + 44, y: board.y + board.h - 50 },
          right: { x: board.x + 316, y: board.y + board.h - 50 },
          disc: 22,
          rope: 26,
          pull: 106,
          tok: 17,
          crown: 32,
          label: 0,
        }
      : { c: { x: 640, y: 250 }, R: 78, left: { x: 250, y: 410 }, right: { x: 1030, y: 410 }, disc: 36, rope: 40, pull: 340, tok: 15, crown: 40, label: 40 }
    const node = CANDIDATES.map((_, c) => {
      const a = (-90 + 72 * c) * (Math.PI / 180)
      return { x: D.c.x + D.R * Math.cos(a), y: D.c.y + D.R * Math.sin(a) }
    })
    const mid = (D.left.x + D.right.x) / 2
    const rope = el('line', { x1: D.left.x + D.rope, x2: D.right.x - D.rope, y1: D.left.y, y2: D.left.y, class: 'rope' }, m)
    const knot = el('circle', { cx: mid, cy: D.left.y, r: this.compact ? 7 : 9, class: 'knot' }, m)
    const side = (p: Point) => {
      const g = el('g', { class: 'fade gone' }, m)
      const disc = el('circle', { cx: p.x, cy: p.y, r: D.disc }, g)
      const letter = text(p.x, p.y + (this.compact ? 7 : 10), '', 'letter duel-letter', g)
      const name = text(p.x, p.y + (this.compact ? 40 : 66), '', 'cand-name', g)
      const score = text(p.x, p.y - (this.compact ? 30 : 52), '', 'big', g)
      return { g, disc, letter, name, score }
    }
    const left = side(D.left)
    const right = side(D.right)
    // Where the voters line up behind the side they prefer.
    const per = this.compact ? Math.floor((crowd.w / 2 - 20) / 26) : 14
    const queue = (isLeft: boolean, i: number): Point =>
      this.compact
        ? { x: isLeft ? crowd.x + 16 + (i % per) * 26 : crowd.x + crowd.w - 16 - (i % per) * 26, y: crowd.y + 24 + Math.floor(i / per) * 30 }
        : { x: isLeft ? 70 + (i % 14) * 38 : 1210 - (i % 14) * 38, y: 578 + Math.floor(i / 14) * 44 }
    const edges = el('g', {}, m)
    const edgeOf = new Map<string, SVGLineElement>()
    const rings = node.map((p, c) => {
      token(p.x, p.y, 16, c, m, D.tok)
      return el('circle', { cx: p.x, cy: p.y, r: 22, class: 'node-ring gone fade' }, m)
    })
    const k = 'deck.duels'
    this.words(this.t(`${k}.title`), this.t(`${k}.ask`))
    await this.how(k)
    await this.bet(node.map((p) => ({ ...p, r: 16, labelY: p.y + D.label })))
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
        list.map((v, i) =>
          this.move(v, queue(isLeft, i), 1, dur, i * (auto ? 10 : 24), 5).then(() => {
            if (isLeft) left.score.textContent = String(++na)
            else right.score.textContent = String(++nc)
            knot.setAttribute('cx', String(mid + ((nc - na) / TOTAL) * D.pull))
          }),
        )
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
    await this.crownAt(node[champ].x, node[champ].y - D.crown)
    // Below the champion, majorities may go round in a circle.
    const [x, y, z] = d.cycle
    const circle = d.cycle.length === 3 ? { a: NAME[x], b: NAME[y], c: NAME[z] } : null
    d.cycle.forEach((c, i) => edgeOf.get(`${c}>${d.cycle[(i + 1) % d.cycle.length]}`)?.classList.add('cycle'))
    const result = this.t(`${k}.result`, { winner: NAME[champ] })
    this.setCaption(circle ? `${result} ${this.t(`${k}.cycle`, circle)}` : result)
    this.settle('duels')
    this.react(champ)
    const rivals = CANDIDATES.length - 1
    // Beside a node, on the side away from the graph; on the compact stage, wrapped to the room left.
    const beside = (c: number, s: string) => {
      const flip = node[c].x >= D.c.x
      const x = node[c].x + (flip ? 34 : -34)
      const room = this.compact ? (flip ? board.x + board.w - x - 2 : x - board.x - 2) : Infinity
      this.note(x, node[c].y + 5, s, flip ? 'start' : 'end', room)
    }
    beside(champ, this.t(`${k}.beatsAll`, { n: rivals }))
    const lost = d.condorcetLoser
    if (lost >= 0) beside(lost, this.t(`${k}.losesAll`, { n: rivals }))
    this.stamp(D.c.x, D.left.y, this.t(`${k}.stamp`), this.t('deck.named', { name: NAME[champ], stamp: this.t(`${k}.stamp`) }))
    await this.lesson(k, { winner: NAME[champ], ...(circle ?? { a: '', b: '', c: '' }) })
  }

  // ---- 6. Approval: the reader ticks a ballot too, then the bullet vote.

  /** The reader ticks or unticks candidates; resolves with the ticks when the reader votes. */
  private tickBallot(): Promise<boolean[]> {
    const my = this.gen
    const ticks = CANDIDATES.map(() => false)
    const picks = this.layer.picks
    picks.replaceChildren()
    const { token: tk, colx } = this.g
    // Ring, badge and target, around the token.
    const [pulse, ringR, hitR, off, badgeR] = this.compact ? [19, 22, 27, 16, 9] : [23, 27, 30, 19, 11]
    const hits = CANDIDATES.map((_, c) => {
      const x = colx[c]
      el('circle', { cx: x, cy: tk.y, r: pulse, class: 'pulse' }, picks)
      const ring = el('circle', { cx: x, cy: tk.y, r: ringR, class: 'ring' }, picks)
      const badge = el('g', { class: 'gone' }, picks)
      el('circle', { cx: x + off, cy: tk.y - off, r: badgeR, class: 'tick-badge' }, badge)
      text(x + off, tk.y - off + 4.5, '✓', 'tick-mark', badge)
      const hit = el('circle', { cx: x, cy: tk.y, r: hitR, class: 'hit' }, picks)
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
    this.groups.forEach((g) => [0, 1].forEach((i) => text(g.cards[i], g.checkY, '✓', 'small-caps', this.layer.notes)))
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
    const off = this.compact ? 16 : 19
    const reader = { g: PERSONAS.length, k: 0, r: 0, home: { x: 0, y: 0 }, ranking: [] } as unknown as Voter
    yours.forEach((on, c) => {
      if (!on) return
      const item = this.makeItem({ ...reader, home: { x: this.g.colx[c] + off, y: this.g.token.y - off } })
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
      this.float(c, this.pileTop(c), -mine.length)
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
    if (this.compact) this.emptyLayout()
    else this.crowdLayout({ ballots: false })
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
      const b = this.cardBox(i, 170, 250)
      const cx = b.x + b.w / 2
      el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 16, class: 'card' }, g)
      const bet = memory.bets[i]
      const called = bet === null ? '' : `${bet ? '✓' : '✗'} ${this.t('deck.bet.yours').toUpperCase()}`
      const tone = 'bet-label ' + (bet ? 'good-text' : 'bad-text')
      if (this.compact) {
        this.cardTitle(cx, b.y + 26, this.t(`deck.systems.${s}`), g)
        token(cx, b.y + 41 + 18, 18, winners[i], g, 17)
        text(cx, b.y + b.h - 26, NAME[winners[i]], 'cand-name', g)
        if (called) text(cx, b.y + b.h - 9, called, tone, g)
        return
      }
      this.cardTitle(cx, 208, this.t(`deck.systems.${s}`), g)
      el('path', { class: 'crown', d: CROWN, transform: `translate(${cx},250)` }, g)
      token(cx, 310, 38, winners[i], g, 30)
      text(cx, 380, NAME[winners[i]], 'cand-name big-name', g)
      if (called) text(cx, 406, called, tone, g)
    })
    // Where to go next.
    const links = [
      { label: this.t('app.nav.sandbox'), path: '/sandbox' },
      { label: this.t('app.nav.rigging'), path: '/rigging' },
      { label: this.t('app.nav.lab'), path: '/lab' },
    ]
    links.forEach((l) => this.button(this.links, l.label, () => this.o.open(l.path), 'ghost'))
  }
}

const CROWN = 'M-16,9 L-16,-5 L-8,2 L0,-12 L8,2 L16,-5 L16,9 Z'

const onClass = (c: number) => `on-c${c}`

/** An arrow beside a button's words, for the eye only. */
function glyph(s: string) {
  const span = html('span', 'glyph')
  span.setAttribute('aria-hidden', 'true')
  span.textContent = s
  return span
}

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
