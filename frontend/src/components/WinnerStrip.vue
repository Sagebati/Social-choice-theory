<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { methodName, winnerName } from '../election'
import { listOf } from '../i18n'
import type { Outcome } from '../types'
import Announce from './Announce.vue'
import Chip from './Chip.vue'

// Which candidate each method elects, side by side, optionally checked against
// the Condorcet winner.
const props = defineProps<{ outcomes: Outcome[]; names: string[]; condorcet?: number | null; showCondorcet?: boolean }>()
const { t } = useI18n()

// Read out by winner rather than by method: fifteen methods often elect only
// two or three people.
const summary = computed(() => {
  const groups = new Map<string, { tied: number[]; methods: string[] }>()
  for (const o of props.outcomes) {
    const key = o.tied.length > 1 ? [...o.tied].sort().join(',') : String(o.winner)
    const group = groups.get(key) ?? { tied: o.tied.length > 1 ? o.tied : [o.winner], methods: [] }
    group.methods.push(methodName(o.method))
    groups.set(key, group)
  }
  const lines = [...groups.values()].map(({ tied, methods }) =>
    tied.length > 1
      ? t('winnerStrip.tied', { names: listOf(tied.map((c) => props.names[c])), methods: listOf(methods) })
      : t('winnerStrip.wins', { name: props.names[tied[0]], methods: listOf(methods) }),
  )
  if (props.showCondorcet) {
    const cw = props.condorcet
    lines.push(cw === null || cw === undefined ? t('winnerStrip.noChampion') : t('winnerStrip.championIs', { name: props.names[cw] }))
  }
  return lines.join(' ')
})
</script>

<template>
  <div class="strip">
    <div v-for="o in outcomes" :key="o.method" class="cell">
      <div class="method">{{ methodName(o.method) }}</div>
      <Chip v-if="o.tied.length === 1" :index="o.winner" :name="names[o.winner]" strong />
      <span v-else class="small">{{ winnerName(names, o) }}</span>
      <span
        v-if="showCondorcet && condorcet !== null && condorcet !== undefined"
        class="pill"
        :class="o.winner === condorcet && o.tied.length === 1 ? 'good' : 'bad'"
      >
        {{ o.winner === condorcet && o.tied.length === 1 ? $t('winnerStrip.condorcet') : $t('winnerStrip.notCondorcet') }}
      </span>
    </div>
    <div v-if="showCondorcet" class="cell cw">
      <div class="method">{{ $t('winnerStrip.champion') }}</div>
      <Chip v-if="condorcet !== null && condorcet !== undefined" :index="condorcet" :name="names[condorcet]" strong />
      <span v-else class="small">{{ $t('winnerStrip.cycle') }}</span>
    </div>
    <Announce :text="summary" />
  </div>
</template>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  gap: 0.5rem;
}

.cell {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 0.5rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-items: flex-start;
}

.cw {
  background: transparent;
  border: 2px solid var(--ink);
}

.method {
  font-size: 0.78rem;
  color: var(--ink-2);
  font-weight: 600;
}
</style>
