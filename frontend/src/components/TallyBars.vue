<script setup lang="ts">
import { computed } from 'vue'
import { color } from '../palette'

// One horizontal bar per candidate, value at the tip. Candidates out of the
// round (null tally) are listed but greyed out.
const props = withDefaults(
  defineProps<{
    names: string[]
    tallies: (number | null)[]
    winner?: number | null
    eliminated?: number[]
    unit?: string
    /** Sort longest first. */
    sorted?: boolean
  }>(),
  { winner: null, eliminated: () => [], unit: '', sorted: false },
)

const max = computed(() => Math.max(1, ...props.tallies.map((t) => Math.abs(t ?? 0))))
const anyNegative = computed(() => props.tallies.some((t) => (t ?? 0) < 0))

const rows = computed(() => {
  const rows = props.names.map((name, i) => ({ i, name, value: props.tallies[i] ?? null }))
  if (props.sorted) rows.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
  return rows
})

const format = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
</script>

<template>
  <div class="bars" role="table" :aria-label="`Tally${unit ? ' (' + unit + ')' : ''}`">
    <div
      v-for="row in rows"
      :key="row.i"
      class="row"
      role="row"
      :class="{ out: row.value === null, eliminated: eliminated.includes(row.i), winner: winner === row.i }"
      :title="`${row.name}: ${row.value === null ? 'out of the race' : format(row.value) + (unit ? ' ' + unit : '')}`"
    >
      <span class="label" role="rowheader">
        <span class="swatch" :style="{ background: color(row.i) }" aria-hidden="true" />
        {{ row.name }}<span v-if="winner === row.i" class="star" aria-label="winner"> ★</span>
      </span>
      <span class="track" role="cell">
        <span
          v-if="row.value !== null && !anyNegative"
          class="fill"
          :style="{ width: `${(Math.max(0, row.value) / max) * 100}%`, background: color(row.i) }"
        />
        <span class="value">
          {{ row.value === null ? 'out' : format(row.value) }}
          <span v-if="eliminated.includes(row.i)" class="tag">eliminated</span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row {
  display: grid;
  grid-template-columns: minmax(4.5rem, max-content) 1fr;
  gap: 0.6rem;
  align-items: center;
  font-size: 0.92rem;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  white-space: nowrap;
}

.winner .label {
  font-weight: 700;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex: none;
}

.track {
  display: flex;
  align-items: center;
  gap: 0.5em;
  min-height: 20px;
  border-left: 1px solid var(--axis);
}

.fill {
  height: 18px;
  border-radius: 0 4px 4px 0;
  min-width: 2px;
  transition: width 0.3s ease;
}

.value {
  font-variant-numeric: tabular-nums;
  color: var(--ink-2);
  white-space: nowrap;
}

.out .label,
.out .value {
  color: var(--muted);
}

.eliminated .fill {
  opacity: 0.45;
}

.tag {
  font-size: 0.75rem;
  color: var(--bad);
  margin-left: 0.3em;
}

.star {
  color: var(--ink);
}
</style>
