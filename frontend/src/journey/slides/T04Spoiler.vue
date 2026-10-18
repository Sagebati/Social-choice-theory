<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import RichText from '../../components/RichText'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { BRUNO, honestBallots, NAMES } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const { t } = useI18n()
const ballots = honestBallots()
const withdrawn = ref<number[]>([])
const { results } = useTown(() => ballots, () => ({ withdrawn: withdrawn.value }), ['plurality'])
const { results: honest } = useTown(() => ballots, () => ({}), ['plurality'])
const plurality = computed(() => results.value?.byMethod.plurality ?? null)
const spoilers = computed(() => honest.value?.byMethod.plurality.spoilers ?? [])
const spoilerText = computed(() =>
  spoilers.value
    .map((s) => t('t04.spoilerItem', { spoiler: NAMES[s.candidate], winner: NAMES[s.winnerWithout] }))
    .join(t('t04.separator')),
)
const done = computed(() => withdrawn.value.length === 1 && plurality.value?.winner === BRUNO && plurality.value.decisive)
</script>

<template>
  <TownFrame :title="t('journey.steps.spoiler')" :seen="['plurality']" current="plurality">
    <template #story>
      <RichText tag="p" :text="t('t04.withdraw')" />
      <RichText tag="p" :text="t('t04.spoiler')" />
      <Challenge id="t4" :done="done">
        {{ t('t04.challenge') }}
        <template #success>{{ t('t04.success') }}</template>
      </Challenge>
      <p v-if="done" class="small">{{ t('t04.florida') }}</p>
      <Takeaway after="t4">
        <p>{{ t('t04.lesson', { n: spoilers.length, list: spoilerText }, spoilers.length) }}</p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">{{ t('t04.eyebrow') }}</div>
        <TallyBars
          v-if="plurality"
          :names="NAMES"
          :tallies="plurality.rounds[0].tallies"
          :winner="plurality.winner"
          :unit="t('common.units.votes')"
        />
      </div>
    </template>
    <template #town>
      <CandidateBar v-model:withdrawn="withdrawn" :winner="plurality?.winner" withdrawable />
      <div class="voters-grid">
        <PersonaCard v-for="(b, i) in ballots" :key="i" :index="i" :ballot="b" style-of="mark" :out="withdrawn" />
      </div>
    </template>
  </TownFrame>
</template>
