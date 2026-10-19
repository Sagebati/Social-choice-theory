<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { color, initial, onColor } from '../palette'
import type { Pairwise } from '../types'

// Every head-to-head contest as an arrow from winner to loser, labelled with the
// vote. Arrows in a majority cycle are drawn heavier.
const props = defineProps<{ names: string[]; pairwise: Pairwise }>()
const arrowId = `arrow-${useId()}`
const { t } = useI18n()

const W = 300
const R = 105
const NODE = 17

const nodes = computed(() => {
  const n = props.names.length
  return props.names.map((name, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    return { i, name, x: W / 2 + R * Math.cos(angle), y: W / 2 + R * Math.sin(angle) }
  })
})

const cycleEdges = computed(() => {
  const set = new Set<string>()
  const cycle = props.pairwise.cycle
  if (cycle) cycle.forEach((a, k) => set.add(`${a}-${cycle[(k + 1) % cycle.length]}`))
  return set
})

const edges = computed(() => {
  const m = props.pairwise.matrix
  const out: { a: number; b: number; x1: number; y1: number; x2: number; y2: number; lx: number; ly: number; text: string; tie: boolean; cycle: boolean }[] = []
  for (let a = 0; a < m.length; a++) {
    for (let b = a + 1; b < m.length; b++) {
      const tie = m[a][b] === m[b][a]
      const [win, lose] = m[a][b] >= m[b][a] ? [a, b] : [b, a]
      const p = nodes.value[win]
      const q = nodes.value[lose]
      const dx = q.x - p.x
      const dy = q.y - p.y
      const len = Math.hypot(dx, dy)
      const ux = dx / len
      const uy = dy / len
      out.push({
        a: win,
        b: lose,
        x1: p.x + ux * (NODE + 3),
        y1: p.y + uy * (NODE + 3),
        x2: q.x - ux * (NODE + 7),
        y2: q.y - uy * (NODE + 7),
        lx: (p.x + q.x) / 2,
        ly: (p.y + q.y) / 2,
        text: `${m[win][lose]}–${m[lose][win]}`,
        tie,
        cycle: cycleEdges.value.has(`${win}-${lose}`),
      })
    }
  }
  return out
})

const summary = computed(() => {
  const cw = props.pairwise.condorcet_winner
  if (cw !== null) return t('duelGraph.beatsEveryone', { name: props.names[cw] })
  const cycle = props.pairwise.cycle
  if (cycle) {
    const chain = [...cycle, cycle[0]].map((c) => props.names[c]).join(` ${t('duelGraph.beats')} `)
    return t('duelGraph.cycle', { cycle: chain })
  }
  return t('duelGraph.ties')
})
</script>

<template>
  <figure class="duels">
    <svg :viewBox="`0 0 ${W} ${W}`" role="img" :aria-label="t('duelGraph.aria', { summary })">
      <defs>
        <marker :id="arrowId" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" class="head" />
        </marker>
      </defs>
      <g v-for="(e, k) in edges" :key="k" class="edge" :class="{ cycle: e.cycle, tie: e.tie }">
        <line :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" :marker-end="e.tie ? undefined : `url(#${arrowId})`" />
        <text :x="e.lx" :y="e.ly" dy="0.35em">{{ e.tie ? `${t('common.tie')} ` : '' }}{{ e.text }}</text>
      </g>
      <g v-for="node in nodes" :key="node.i" :transform="`translate(${node.x} ${node.y})`">
        <circle
          v-if="pairwise.condorcet_winner === node.i"
          class="crown"
          :r="NODE + 5"
        />
        <circle :r="NODE" :fill="color(node.i)" class="node" />
        <text class="initial" dy="0.35em" :fill="onColor(node.i)">{{ initial(node.name, names) }}</text>
      </g>
    </svg>
    <figcaption>{{ summary }}</figcaption>
  </figure>
</template>

<style scoped>
.duels {
  margin: 0;
}

svg {
  width: 100%;
  max-width: 300px;
  display: block;
  margin: 0 auto;
}

.edge line {
  stroke: var(--axis);
  stroke-width: 2;
}

.edge.cycle line {
  stroke: var(--ink);
  stroke-width: 3;
}

.edge.tie line {
  stroke-dasharray: 4 4;
}

.head {
  fill: var(--ink-2);
}

.edge text {
  font-size: 12px;
  text-anchor: middle;
  fill: var(--ink);
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 5px;
  stroke-linejoin: round;
  font-variant-numeric: tabular-nums;
}

.node {
  stroke: var(--surface);
  stroke-width: 3;
}

.crown {
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.5;
}

.initial {
  font-weight: 800;
  font-size: 15px;
  text-anchor: middle;
}

figcaption {
  text-align: center;
  font-size: 0.9rem;
  color: var(--ink-2);
  margin-top: 0.3rem;
}
</style>
