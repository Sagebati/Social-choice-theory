<script setup lang="ts">
import { computed } from 'vue'
import { methodName } from '../election'
import type { Manipulability } from '../types'

// Share of random elections in which some bloc of voters can profit from lying,
// one bar per method, highest first. A single series, so no legend: the title
// says what is plotted.
const props = defineProps<{ data: Manipulability[]; highlight?: string | null }>()

const rows = computed(() => [...props.data].sort((a, b) => b.rate - a.rate))
const pct = (r: number) => `${Math.round(r * 100)}%`
</script>

<template>
  <figure class="chart">
    <div class="axis small muted" aria-hidden="true">
      <span>0%</span><span>50%</span><span>100%</span>
    </div>
    <div class="bars" role="table" aria-label="Share of random elections that can be manipulated, by method">
      <div
        v-for="r in rows"
        :key="r.method"
        class="row"
        role="row"
        :class="{ hl: highlight === r.method }"
        tabindex="0"
        :title="`${methodName(r.method)}: ${r.manipulable} of ${r.samples} elections manipulable (${pct(r.rate)})`"
      >
        <span class="label" role="rowheader">{{ methodName(r.method) }}</span>
        <span class="track" role="cell">
          <span class="fill" :style="{ width: `${r.rate * 100}%` }" />
          <span class="value">{{ pct(r.rate) }}</span>
        </span>
      </div>
    </div>
    <figcaption class="small muted">
      {{ data[0]?.samples ?? 0 }} random elections with {{ data[0]?.candidates ?? 3 }} candidates; the same elections for
      every method.
    </figcaption>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
}

.axis {
  display: flex;
  justify-content: space-between;
  margin-left: 9.6rem;
  margin-right: 3rem;
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.row {
  display: grid;
  grid-template-columns: 9rem 1fr;
  gap: 0.6rem;
  align-items: center;
  font-size: 0.88rem;
  border-radius: 4px;
}

.row:hover .fill,
.row:focus-visible .fill {
  filter: brightness(1.12);
}

.row.hl .label {
  font-weight: 800;
}

.label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-left: 1px solid var(--axis);
  background: linear-gradient(to right, transparent calc(50% - 0.5px), var(--grid) calc(50% - 0.5px), var(--grid) calc(50% + 0.5px), transparent calc(50% + 0.5px));
  /* Room for the value label of a full-width bar. */
  margin-right: 3rem;
}

.fill {
  flex: none;
  height: 16px;
  border-radius: 0 4px 4px 0;
  background: var(--c0);
  min-width: 2px;
  transition: width 0.4s ease;
}

.value {
  flex: none;
  font-variant-numeric: tabular-nums;
  color: var(--ink-2);
}

figcaption {
  margin-top: 0.5rem;
}
</style>
