<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import Predict from '../../components/Predict.vue'
import RichText from '../../components/RichText'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { ERIK, honestBallots, NAMES, PERSONAS, TOTAL_VOTERS } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const { t } = useI18n()
const ballots = honestBallots()
const { results } = useTown(() => ballots, () => ({}), ['plurality'])
const plurality = computed(() => results.value?.byMethod.plurality ?? null)
const guess = ref<number | null>(null)
const lastGuess = ref<number | null>(null)
const revealed = computed(() => guess.value !== null)

// How many voters rank the winner last? Counted from the personas themselves.
const lastPlace = computed(() => {
  const w = plurality.value?.winner ?? ERIK
  return PERSONAS.filter((p) => p.ranking[p.ranking.length - 1] === w).reduce((s, p) => s + p.voters, 0)
})
const lastOptions = ['0', '9', '16', '21']
const lastAnswer = computed(() => lastOptions.indexOf(String(lastPlace.value)))
</script>

<template>
  <TownFrame :title="t('journey.steps.oneMark')" :seen="revealed ? ['plurality'] : []" current="plurality">
    <template #story>
      <RichText tag="p" :text="t('t02.intro')" />
      <p>{{ t('t02.ballot') }}</p>
      <Predict v-model="guess" :question="t('t02.question')" :options="NAMES" :answer="plurality?.winner ?? null" />
      <template v-if="revealed && plurality">
        <RichText
          tag="p"
          :text="
            t('t02.wins', {
              winner: NAMES[plurality.winner],
              votes: plurality.rounds[0].tallies[plurality.winner] ?? 0,
              total: TOTAL_VOTERS,
            })
          "
        />
        <Predict
          v-model="lastGuess"
          :question="t('t02.lastQuestion', { winner: NAMES[plurality.winner] })"
          :options="lastOptions"
          :answer="lastAnswer"
        />
        <Challenge id="t2" :done="lastGuess !== null">
          {{ t('t02.challenge') }}
          <template #success>{{ t('t02.success', { voters: lastPlace }) }}</template>
        </Challenge>
        <Takeaway after="t2">
          <p>{{ t('t02.lesson') }}</p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">{{ t('t02.count') }}</div>
        <TallyBars
          v-if="revealed && plurality"
          :names="NAMES"
          :tallies="plurality.rounds[0].tallies"
          :winner="plurality.winner"
          :unit="t('common.units.votes')"
        />
        <p v-else class="muted small">{{ t('t02.hint') }}</p>
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="revealed ? plurality?.winner : null" />
      <div class="voters-grid">
        <PersonaCard v-for="(b, i) in ballots" :key="i" :index="i" :ballot="b" style-of="mark" />
      </div>
    </template>
  </TownFrame>
</template>
