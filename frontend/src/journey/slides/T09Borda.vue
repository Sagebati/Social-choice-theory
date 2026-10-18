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
import { honestBallots, NAMES } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const { t } = useI18n()
const ballots = honestBallots()
const { results } = useTown(() => ballots, () => ({}), ['borda'])
const borda = computed(() => results.value?.byMethod.borda ?? null)
const guess = ref<number | null>(null)
const revealed = computed(() => guess.value !== null)
const seen = computed(() => (revealed.value ? ['plurality', 'two_round', 'irv', 'borda'] : ['plurality', 'two_round', 'irv']) as ('plurality' | 'two_round' | 'irv' | 'borda')[])
</script>

<template>
  <TownFrame :title="t('journey.steps.borda')" :seen="seen" current="borda">
    <template #story>
      <RichText tag="p" :text="t('t09.intro')" />
      <p>{{ t('t09.ballots') }}</p>
      <Predict v-model="guess" :question="t('t09.question')" :options="NAMES" :answer="borda?.winner ?? null" />
      <template v-if="revealed && borda">
        <Challenge id="t9" :done="revealed">
          {{ t('t09.challenge') }}
          <template #success>{{ t('t09.success') }}</template>
        </Challenge>
        <Takeaway after="t9">
          <p>{{ t('t09.lesson') }}</p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">{{ t('t09.eyebrow') }}</div>
        <TallyBars
          v-if="revealed && borda"
          :names="NAMES"
          :tallies="borda.rounds[0].tallies"
          :winner="borda.winner"
          :unit="t('common.units.points')"
          sorted
        />
        <p v-else class="muted small">{{ t('t09.hint') }}</p>
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="revealed ? borda?.winner : null" />
      <div class="voters-grid">
        <PersonaCard v-for="(b, i) in ballots" :key="i" :index="i" :ballot="b" style-of="points" />
      </div>
    </template>
  </TownFrame>
</template>
