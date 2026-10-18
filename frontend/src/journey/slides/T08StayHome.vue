<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import RichText from '../../components/RichText'
import RoundsView from '../../components/RoundsView.vue'
import Takeaway from '../../components/Takeaway.vue'
import { betterOff, DANIEL, honestBallots, NAMES, PERSONAS, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import { listOf } from '../../i18n'
import TownFrame from '../TownFrame.vue'
import { absentGroups, verdicts } from '../town'

const { t } = useI18n()
const ballots = ref<CastBallot[]>(honestBallots())
const { results } = useTown(() => ballots.value, () => ({}), ['irv'])
const irv = computed(() => results.value?.byMethod.irv ?? null)
const step = ref(99)
const away = computed(() => absentGroups(ballots.value))
const verdict = computed(() => verdicts(ballots.value, DANIEL, irv.value?.winner ?? null))
const done = computed(
  () =>
    !!irv.value?.decisive &&
    away.value.length > 0 &&
    away.value.every((g) => betterOff(g, DANIEL, irv.value!.winner)),
)
const stayers = computed(() =>
  listOf(
    away.value.map((g) => {
      const n = PERSONAS[g].voters - (ballots.value[g].voters ?? PERSONAS[g].voters)
      return t('t08.stayers', { n, name: PERSONAS[g].name }, n)
    }),
  ),
)

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
  step.value = 99
}
</script>

<template>
  <TownFrame :title="t('journey.steps.stayHome')" :seen="['plurality', 'two_round', 'irv']" current="irv">
    <template #story>
      <p>{{ t('t08.intro') }}</p>
      <Challenge id="t8" :done="done">
        <RichText :text="t('t08.challenge')" />
        <template #success>{{ t('t08.success', { stayers, winner: NAMES[irv!.winner] }) }}</template>
      </Challenge>
      <Takeaway after="t8">
        <RichText tag="p" :text="t('t08.lesson')" />
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <RoundsView v-if="irv" v-model:step="step" :outcome="irv.view" :names="NAMES" :unit="t('common.units.votes')" />
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="irv?.winner" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="ranked"
          can-stay-home
          :verdict="verdict[i]"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
