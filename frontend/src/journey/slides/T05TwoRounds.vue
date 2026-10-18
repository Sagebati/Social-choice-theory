<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import Predict from '../../components/Predict.vue'
import RichText from '../../components/RichText'
import RoundsView from '../../components/RoundsView.vue'
import Takeaway from '../../components/Takeaway.vue'
import { honestBallots, NAMES } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const { t } = useI18n()
const ballots = honestBallots()
const { results } = useTown(() => ballots, () => ({}), ['two_round', 'plurality'])
const twoRound = computed(() => results.value?.byMethod.two_round ?? null)
const finalists = computed(() => {
  const r = twoRound.value?.rounds[1]
  return r ? r.tallies.map((t, c) => (t === null ? -1 : c)).filter((c) => c >= 0) : []
})
const options = computed(() => finalists.value.map((c) => NAMES[c]))
const guess = ref<number | null>(null)
const answer = computed(() => (twoRound.value ? finalists.value.indexOf(twoRound.value.winner) : null))
const step = ref(1)
const reachedEnd = computed(() => guess.value !== null && step.value >= 1)
// The runoff score, winner first.
const score = computed(() => {
  const r = twoRound.value?.rounds[1]
  if (!twoRound.value || !r) return { won: 0, lost: 0 }
  const w = twoRound.value.winner
  return { won: r.tallies[w] ?? 0, lost: r.tallies.find((x, c) => x !== null && c !== w) ?? 0 }
})
</script>

<template>
  <TownFrame
    :title="t('journey.steps.twoRounds')"
    :seen="guess !== null ? ['plurality', 'two_round'] : ['plurality']"
    current="two_round"
  >
    <template #story>
      <RichText tag="p" :text="t('t05.intro')" />
      <p>{{ t('t05.roundOne') }}</p>
      <Predict v-model="guess" :question="t('t05.question')" :options="options" :answer="answer" />
      <template v-if="guess !== null && twoRound">
        <Challenge id="t5" :done="reachedEnd">
          {{ t('t05.challenge') }}
          <template #success>{{ t('t05.success', { winner: NAMES[twoRound.winner], ...score }) }}</template>
        </Challenge>
        <Takeaway after="t5">
          <p>{{ t('t05.lesson') }}</p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <RoundsView
          v-if="twoRound && guess !== null"
          v-model:step="step"
          :outcome="twoRound.view"
          :names="NAMES"
          :unit="t('common.units.votes')"
        />
        <p v-else class="muted small">{{ t('t05.hint') }}</p>
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="guess !== null ? twoRound?.winner : null" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="runoff"
          :finalists="guess !== null ? finalists : []"
        />
      </div>
    </template>
  </TownFrame>
</template>
