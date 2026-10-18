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
const { results } = useTown(() => ballots, () => ({}), ['irv'])
const irv = computed(() => results.value?.byMethod.irv ?? null)
const guess = ref<number | null>(null)
const step = ref(0)
const rounds = computed(() => irv.value?.rounds.length ?? 0)
const atEnd = computed(() => rounds.value > 1 && step.value >= rounds.value - 1)
// Candidates out before the round on screen, and where each ballot counts now.
const out = computed(() => (irv.value ? irv.value.rounds.slice(0, step.value).flatMap((r) => r.eliminated) : []))
const counting = (ranking: number[]) => ranking.find((c) => !out.value.includes(c)) ?? null
</script>

<template>
  <TownFrame
    :title="t('journey.steps.instantRunoff')"
    :seen="atEnd ? ['plurality', 'two_round', 'irv'] : ['plurality', 'two_round']"
    current="irv"
  >
    <template #story>
      <RichText tag="p" :text="t('t07.intro')" />
      <p>{{ t('t07.count') }}</p>
      <Predict
        v-model="guess"
        :question="t('t07.question')"
        :options="NAMES"
        :answer="irv?.rounds[0].eliminated[0] ?? null"
      />
      <template v-if="guess !== null && irv">
        <Challenge id="t7" :done="atEnd">
          <RichText :text="t('t07.challenge')" />
          <template #success>{{ t('t07.success') }}</template>
        </Challenge>
        <Takeaway after="t7">
          <p>{{ t('t07.lesson') }}</p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <RoundsView
          v-if="irv && guess !== null"
          v-model:step="step"
          :outcome="irv.view"
          :names="NAMES"
          :unit="t('common.units.votes')"
        />
        <p v-else class="muted small">{{ t('t07.hint') }}</p>
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="atEnd ? irv?.winner : null" :out="guess !== null ? out : []" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="ranked"
          :out="guess !== null ? out : []"
          :counting="guess !== null ? counting(b.ranking) : null"
        />
      </div>
    </template>
  </TownFrame>
</template>
