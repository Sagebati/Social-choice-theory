<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { winnerName } from '../election'
import { listOf } from '../i18n'
import type { Outcome } from '../types'
import Announce from './Announce.vue'
import RichText from './RichText'
import TallyBars from './TallyBars.vue'

// Steps through a count round by round. The current round is a v-model so the
// map can recolour voters as their ballots transfer.
const props = defineProps<{ outcome: Outcome; names: string[]; unit?: string }>()
const step = defineModel<number>('step', { default: 0 })
const { t, n } = useI18n()

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

// Back and Next stay focusable at either end (aria-disabled, not disabled), so
// stepping to the last round doesn't throw keyboard focus to the top of the page.
const back = () => step.value > 0 && step.value--
const next = () => !last.value && step.value++

// Each step reads out its tallies, and the winner at the end. A recount after a
// drag is already announced by the page.
const summary = computed(() => {
  const r = round.value
  const tallies = listOf(
    props.names.flatMap((name, i) => {
      const v = r.tallies[i]
      return v === null || v === undefined ? [] : [t('rounds.tally', { name, value: n(v, { maximumFractionDigits: 1 }) })]
    }),
  )
  const text = t('rounds.summary', { round: r.title, tallies })
  return last.value ? `${text} ${t('rounds.winner', { name: winnerName(props.names, props.outcome) })}` : text
})
const announced = ref('')
watch(step, () => (announced.value = summary.value), { flush: 'post' })
</script>

<template>
  <div class="rounds">
    <div class="head">
      <strong>{{ round.title }}</strong>
      <span v-if="count > 1" class="muted small">{{ t('rounds.of', { n: Math.min(step, count - 1) + 1, total: count }) }}</span>
      <span class="spacer" />
      <template v-if="count > 1">
        <button class="btn small" :aria-disabled="step === 0" @click="back">{{ t('rounds.back') }}</button>
        <button class="btn small primary" :aria-disabled="last" @click="next">{{ t('rounds.next') }}</button>
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
      <span v-if="outcome.used_tiebreak" class="tiebreak muted small">{{ t('rounds.tiebreak') }}</span>
    </p>
    <Announce :text="announced" :delay="150" />
  </div>
</template>

<style scoped>
.tiebreak {
  margin-left: 0.3em;
}

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
