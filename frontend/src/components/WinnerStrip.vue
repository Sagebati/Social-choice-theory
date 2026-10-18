<script setup lang="ts">
import { methodName } from '../election'
import type { Outcome } from '../types'
import Chip from './Chip.vue'

// Which candidate each method elects, side by side, optionally checked against
// the Condorcet winner.
defineProps<{ outcomes: Outcome[]; names: string[]; condorcet?: number | null; showCondorcet?: boolean }>()
</script>

<template>
  <div class="strip">
    <div v-for="o in outcomes" :key="o.method" class="cell">
      <div class="method">{{ methodName(o.method) }}</div>
      <Chip v-if="o.tied.length === 1" :index="o.winner" :name="names[o.winner]" strong />
      <span v-else class="small">{{ $t('common.tie') }}</span>
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
