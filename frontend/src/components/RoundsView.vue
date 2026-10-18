<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { winnerName } from '../election'
import type { Outcome } from '../types'
import RichText from './RichText'
import TallyBars from './TallyBars.vue'

// Steps through a count round by round. The current round is a v-model so the
// map can recolour voters as their ballots transfer.
const props = defineProps<{ outcome: Outcome; names: string[]; unit?: string }>()
const step = defineModel<number>('step', { default: 0 })
const { t } = useI18n()

const count = computed(() => props.outcome.rounds.length)
const round = computed(() => props.outcome.rounds[Math.min(step.value, count.value - 1)])
const last = computed(() => step.value >= count.value - 1)

// A new count (e.g. after a drag) may have fewer rounds; a step past the end
// means "the last round".
watch(
  [count, step],
  ([n, s]) => {
    if (s > n - 1) step.value = Math.max(0, n - 1)
  },
  { immediate: true },
)
</script>

<template>
  <div class="rounds">
    <div class="head">
      <strong>{{ round.title }}</strong>
      <span v-if="count > 1" class="muted small">{{ t('rounds.of', { n: Math.min(step, count - 1) + 1, total: count }) }}</span>
      <span class="spacer" />
      <template v-if="count > 1">
        <button class="btn small" :disabled="step === 0" @click="step--">{{ t('rounds.back') }}</button>
        <button class="btn small primary" :disabled="last" @click="step++">{{ t('rounds.next') }}</button>
      </template>
    </div>
    <TallyBars
      :names="names"
      :tallies="round.tallies"
      :eliminated="round.eliminated"
      :winner="last ? outcome.winner : null"
      :unit="unit"
    />
    <ul class="notes">
      <li v-for="(note, i) in round.notes" :key="i">{{ note }}</li>
    </ul>
    <p v-if="last" class="result">
      <RichText :text="t('rounds.winner', { name: winnerName(names, outcome) })" />
      <span v-if="outcome.used_tiebreak" class="muted small"> {{ t('rounds.tiebreak') }}</span>
    </p>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.7rem;
}

.spacer {
  flex: 1;
}

.notes {
  margin: 0.7rem 0 0;
  padding-left: 1.1rem;
  color: var(--ink-2);
  font-size: 0.9rem;
}

.result {
  margin: 0.6rem 0 0;
}
</style>
