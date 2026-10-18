<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import RichText from '../../components/RichText'
import RoundsView from '../../components/RoundsView.vue'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { betterOff, BRUNO, defaultScores, honestBallots, NAMES, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import { listOf } from '../../i18n'
import TownFrame from '../TownFrame.vue'
import { verdicts } from '../town'

const ANA = 2
const { t } = useI18n()
// Honest stars: 5 for a favourite, then 4, 3, 1, 0.
const honest = (): CastBallot[] => honestBallots().map((b) => ({ ...b, scores: defaultScores(b.ranking) }))
const ballots = ref<CastBallot[]>(honest())
const { results } = useTown(() => ballots.value, () => ({}), ['score', 'star'])
const score = computed(() => results.value?.byMethod.score ?? null)
const star = computed(() => results.value?.byMethod.star ?? null)
const verdict = computed(() => verdicts(ballots.value, BRUNO, star.value?.winner ?? null))
const done = computed(() => !!star.value?.decisive && betterOff(ANA, BRUNO, star.value.winner))
const finalists = computed(() => {
  const r = star.value?.rounds[1]
  return r ? r.tallies.map((v, c) => (v === null ? -1 : c)).filter((c) => c >= 0) : []
})
const finalistNames = computed(() => listOf(finalists.value.map((c) => NAMES[c])))
const step = ref(1)

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
}
</script>

<template>
  <TownFrame :title="t('journey.steps.stars')" :seen="['plurality', 'two_round', 'irv', 'borda', 'schulze', 'approval', 'star']" current="star">
    <template #story>
      <RichText tag="p" :text="t('t14.score')" />
      <RichText tag="p" :text="t('t14.star')" />
      <p>{{ t('t14.exaggerate') }}</p>
      <Challenge id="t14" :done="done">
        {{ t('t14.challenge') }}
        <template #success>{{ t('t14.success', { finalists: finalistNames, winner: NAMES[star!.winner] }) }}</template>
      </Challenge>
      <Takeaway after="t14">
        <p>{{ t('t14.lesson') }}</p>
      </Takeaway>
    </template>
    <template #panel>
      <WinnerStrip v-if="score && star" :outcomes="[score.view, star.view]" :names="NAMES" />
      <div v-if="star" class="card">
        <div class="eyebrow">{{ t('t14.rounds') }}</div>
        <RoundsView v-model:step="step" :outcome="star.view" :names="NAMES" :unit="t('common.units.stars')" />
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="star?.winner" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="stars"
          :editable="i === ANA"
          :verdict="verdict[i]"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
