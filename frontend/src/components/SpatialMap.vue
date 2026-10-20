<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { color, initial, onColor } from '../palette'
import type { Crowd, Point, SpatialCandidate } from '../types'
import Announce from './Announce.vue'

// The opinion map. Model coordinates are the unit square; the SVG draws it at SIZE.
const SIZE = 400

const props = withDefaults(
  defineProps<{
    candidates: SpatialCandidate[]
    crowds?: Crowd[]
    voters?: Point[]
    /** Every voter's position as returned by the API (individual voters first). */
    points?: Point[]
    /** Candidate index each point is coloured with (null: grey). */
    colors?: (number | null)[]
    /** Points to mark as having voted strategically. */
    rings?: boolean[]
    yee?: { resolution: number; cells: number[] } | null
    /** Which candidates can be dragged. */
    movable?: 'all' | 'none' | number[]
    crowdsMovable?: boolean
    votersMovable?: boolean
    winner?: number | null
    faded?: number[]
    /** Draw lines from individual voters to every candidate. */
    lines?: boolean
    /** Approval radius drawn around individual voters. */
    radius?: number | null
    voterLabels?: string[]
    selected?: { kind: 'candidate' | 'crowd'; index: number } | null
    label?: string
  }>(),
  {
    crowds: () => [],
    voters: () => [],
    points: () => [],
    colors: () => [],
    rings: () => [],
    yee: null,
    movable: 'all',
    crowdsMovable: true,
    votersMovable: true,
    winner: null,
    faded: () => [],
    lines: false,
    radius: null,
    voterLabels: () => [],
    selected: null,
    label: undefined,
  },
)
const { t } = useI18n()

const emit = defineEmits<{
  'update:candidates': [SpatialCandidate[]]
  'update:crowds': [Crowd[]]
  'update:voters': [Point[]]
  select: [{ kind: 'candidate' | 'crowd'; index: number }]
}>()

type Kind = 'candidate' | 'crowd' | 'voter'
const svg = ref<SVGSVGElement | null>(null)
const dragging = ref<{ kind: Kind; index: number } | null>(null)
let offset = { x: 0, y: 0 }

const clamp = (v: number) => Math.min(1, Math.max(0, v))

function canMove(kind: Kind, index: number): boolean {
  if (kind === 'crowd') return props.crowdsMovable
  if (kind === 'voter') return props.votersMovable
  return props.movable === 'all' || (Array.isArray(props.movable) && props.movable.includes(index))
}

function position(kind: Kind, index: number): Point {
  if (kind === 'candidate') return props.candidates[index]
  if (kind === 'crowd') return props.crowds[index]
  return props.voters[index]
}

function place(kind: Kind, index: number, p: Point) {
  const x = clamp(p.x)
  const y = clamp(p.y)
  if (kind === 'candidate') emit('update:candidates', props.candidates.map((c, i) => (i === index ? { ...c, x, y } : c)))
  else if (kind === 'crowd') emit('update:crowds', props.crowds.map((c, i) => (i === index ? { ...c, x, y } : c)))
  else emit('update:voters', props.voters.map((v, i) => (i === index ? { x, y } : v)))
}

function toModel(event: PointerEvent): Point {
  const el = svg.value!
  const pt = el.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const p = pt.matrixTransform(el.getScreenCTM()!.inverse())
  return { x: p.x / SIZE, y: p.y / SIZE }
}

function start(event: PointerEvent, kind: Kind, index: number) {
  if (kind !== 'voter') emit('select', { kind, index })
  if (!canMove(kind, index)) return
  event.preventDefault()
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  dragging.value = { kind, index }
  const p = toModel(event)
  const cur = position(kind, index)
  offset = { x: cur.x - p.x, y: cur.y - p.y }
}

function move(event: PointerEvent) {
  if (!dragging.value) return
  const p = toModel(event)
  place(dragging.value.kind, dragging.value.index, { x: p.x + offset.x, y: p.y + offset.y })
}

function end() {
  dragging.value = null
}

// Where a token is, in words: "Ada at 52, 55".
function where(kind: Kind, index: number, p: Point = position(kind, index)): string {
  const x = Math.round(p.x * 100)
  const y = Math.round(p.y * 100)
  if (kind === 'crowd') return t('spatialMap.crowdAt', { n: props.crowds[index].count, x, y }, props.crowds[index].count)
  const name = kind === 'candidate' ? props.candidates[index].name : (props.voterLabels[index] ?? t('spatialMap.you'))
  return t('spatialMap.candidateAt', { name, x, y })
}
const moved = ref('')

function key(event: KeyboardEvent, kind: Kind, index: number) {
  // Tokens are buttons: pressing one selects it and says how to move it.
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (kind !== 'voter') emit('select', { kind, index })
    moved.value = canMove(kind, index) ? t('spatialMap.howToMove', { position: where(kind, index) }) : where(kind, index)
    return
  }
  nudge(event, kind, index)
}

function nudge(event: KeyboardEvent, kind: Kind, index: number) {
  const step = event.shiftKey ? 0.05 : 0.01
  const delta: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }
  const d = delta[event.key]
  if (!d || !canMove(kind, index)) return
  event.preventDefault()
  const cur = position(kind, index)
  const p = { x: clamp(cur.x + d[0]), y: clamp(cur.y + d[1]) }
  place(kind, index, p)
  moved.value = where(kind, index, p)
}

const cellSize = computed(() => (props.yee ? SIZE / props.yee.resolution : 0))
const yeeCells = computed(() => {
  if (!props.yee) return []
  const r = props.yee.resolution
  return props.yee.cells.map((winner, i) => ({ x: (i % r) * cellSize.value, y: Math.floor(i / r) * cellSize.value, winner }))
})

function nearest(p: Point): number {
  let best = 0
  let bestD = Infinity
  props.candidates.forEach((c, i) => {
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

const describe = computed(() => {
  const cs = props.candidates
    .map((c) => t('spatialMap.candidateAt', { name: c.name, x: Math.round(c.x * 100), y: Math.round(c.y * 100) }))
    .join('; ')
  return t('spatialMap.describe', { label: props.label ?? t('spatialMap.label'), candidates: cs })
})
</script>

<template>
  <svg
    ref="svg"
    class="map"
    :viewBox="`0 0 ${SIZE} ${SIZE}`"
    role="group"
    :aria-label="describe"
    @pointermove="move"
    @pointerup="end"
    @pointercancel="end"
  >
    <rect class="bg" :width="SIZE" :height="SIZE" rx="12" />
    <g v-if="yee" class="yee" aria-hidden="true">
      <rect
        v-for="(cell, i) in yeeCells"
        :key="i"
        :x="cell.x"
        :y="cell.y"
        :width="cellSize + 0.5"
        :height="cellSize + 0.5"
        :fill="color(cell.winner)"
      />
    </g>
    <g class="gridlines" aria-hidden="true">
      <line v-for="k in 3" :key="'v' + k" :x1="(k * SIZE) / 4" y1="0" :x2="(k * SIZE) / 4" :y2="SIZE" />
      <line v-for="k in 3" :key="'h' + k" x1="0" :y1="(k * SIZE) / 4" :x2="SIZE" :y2="(k * SIZE) / 4" />
    </g>

    <!-- Crowds: a faint disc that can be dragged as a whole. -->
    <g
      v-for="(crowd, i) in crowds"
      :key="'crowd' + i"
      class="crowd"
      :class="{ movable: crowdsMovable, selected: selected?.kind === 'crowd' && selected.index === i }"
      :tabindex="crowdsMovable ? 0 : -1"
      role="button"
      :aria-label="t('spatialMap.crowd', crowd.count)"
      @pointerdown="start($event, 'crowd', i)"
      @keydown="key($event, 'crowd', i)"
    >
      <circle :cx="crowd.x * SIZE" :cy="crowd.y * SIZE" :r="Math.max(crowd.spread * SIZE, 10) + 6" />
    </g>

    <!-- Every voter, coloured by the candidate their ballot favours. -->
    <g class="voters" aria-hidden="true">
      <circle
        v-for="(p, i) in points"
        :key="i"
        :cx="p.x * SIZE"
        :cy="p.y * SIZE"
        r="3.4"
        :fill="colors[i] === null || colors[i] === undefined ? 'var(--muted)' : color(colors[i]!)"
        :class="{ ring: rings[i] }"
      />
    </g>

    <!-- Individual voters ("You"). -->
    <g v-for="(v, i) in voters" :key="'you' + i">
      <g v-if="lines" class="lines" aria-hidden="true">
        <line
          v-for="(c, j) in candidates"
          :key="j"
          :x1="v.x * SIZE"
          :y1="v.y * SIZE"
          :x2="c.x * SIZE"
          :y2="c.y * SIZE"
          :class="{ best: j === nearest(v) }"
        />
      </g>
      <circle v-if="radius" class="radius" :cx="v.x * SIZE" :cy="v.y * SIZE" :r="radius * SIZE" aria-hidden="true" />
    </g>

    <g
      v-for="(c, i) in candidates"
      :key="'cand' + i"
      class="candidate"
      :class="{
        movable: canMove('candidate', i),
        faded: faded.includes(i),
        selected: selected?.kind === 'candidate' && selected.index === i,
      }"
      :transform="`translate(${c.x * SIZE} ${c.y * SIZE})`"
      :tabindex="canMove('candidate', i) ? 0 : -1"
      role="button"
      :aria-label="winner === i ? t('spatialMap.winning', { name: c.name }) : c.name"
      @pointerdown="start($event, 'candidate', i)"
      @keydown="key($event, 'candidate', i)"
    >
      <circle class="hit" r="24" />
      <circle v-if="winner === i" class="win-ring" r="21" />
      <circle class="token" r="15" :fill="color(i)" />
      <text class="initial" dy="0.35em" :fill="onColor(i)">{{ initial(c.name, candidates.map((x) => x.name)) }}</text>
      <text class="name" :y="winner === i ? -28 : -23">{{ winner === i ? '★ ' : '' }}{{ c.name }}</text>
    </g>

    <g
      v-for="(v, i) in voters"
      :key="'voter' + i"
      class="you"
      :class="{ movable: votersMovable }"
      :transform="`translate(${v.x * SIZE} ${v.y * SIZE})`"
      :tabindex="votersMovable ? 0 : -1"
      role="button"
      :aria-label="voterLabels[i] ?? t('spatialMap.you')"
      @pointerdown="start($event, 'voter', i)"
      @keydown="key($event, 'voter', i)"
    >
      <circle class="hit" r="22" />
      <circle class="dot" r="9" :fill="color(nearest(v))" />
      <text class="name" y="25">{{ voterLabels[i] ?? t('spatialMap.you') }}</text>
    </g>
  </svg>
  <!-- A live region has to be HTML, so it sits beside the SVG. -->
  <Announce :text="moved" :delay="250" />
</template>

<style scoped>
.map {
  width: 100%;
  height: auto;
  display: block;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.bg {
  fill: var(--surface);
  stroke: var(--border);
}

.yee rect {
  opacity: 0.3;
}

.gridlines line {
  stroke: var(--grid);
  stroke-width: 1;
}

.crowd circle {
  fill: var(--ink);
  fill-opacity: 0.035;
  stroke: var(--axis);
  stroke-width: 1;
}

.crowd.movable {
  cursor: grab;
}

.crowd.movable:hover circle,
.crowd.selected circle {
  fill-opacity: 0.08;
  stroke: var(--ink-2);
}

.voters circle {
  stroke: var(--surface);
  stroke-width: 0.8;
  pointer-events: none;
  transition: fill 0.25s;
}

.voters circle.ring {
  stroke: var(--ink);
  stroke-width: 1.6;
}

.lines line {
  stroke: var(--axis);
  stroke-width: 1;
}

.lines line.best {
  stroke: var(--ink);
  stroke-width: 2;
}

.radius {
  fill: var(--ink);
  fill-opacity: 0.05;
  stroke: var(--ink-2);
  stroke-width: 1.2;
}

.candidate .hit,
.you .hit {
  fill: transparent;
}

.candidate.movable,
.you.movable {
  cursor: grab;
}

.candidate .token {
  stroke: var(--surface);
  stroke-width: 3;
}

.candidate.selected .token {
  stroke: var(--ink);
}

.candidate .win-ring {
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.5;
}

.candidate.faded {
  opacity: 0.3;
}

.initial {
  font-weight: 800;
  font-size: 15px;
  text-anchor: middle;
  pointer-events: none;
}

.name {
  font-size: 13px;
  font-weight: 700;
  text-anchor: middle;
  fill: var(--ink);
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 4px;
  stroke-linejoin: round;
  pointer-events: none;
}

.you .dot {
  stroke: var(--ink);
  stroke-width: 3;
}

.candidate:focus-visible,
.you:focus-visible,
.crowd:focus-visible {
  outline: none;
}

.candidate:focus-visible .token,
.you:focus-visible .dot,
.crowd:focus-visible circle {
  stroke: var(--c0);
  stroke-width: 4;
}
</style>
