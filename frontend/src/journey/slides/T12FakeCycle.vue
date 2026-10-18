<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import DuelGraph from '../../components/DuelGraph.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import PersonaLieFinder from '../../components/PersonaLieFinder.vue'
import RichText from '../../components/RichText'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { BRUNO, CAMILLE, honestBallots, NAMES, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'
import { verdicts } from '../town'

const ANA = 2
const { t } = useI18n()
const ballots = ref<CastBallot[]>(honestBallots())
const { results } = useTown(() => ballots.value, () => ({}), ['schulze', 'ranked_pairs', 'minimax', 'copeland'])
const pairwise = computed(() => results.value?.pairwise ?? null)
const schulze = computed(() => results.value?.byMethod.schulze ?? null)
const outcomes = computed(() => (results.value ? Object.values(results.value.byMethod).map((r) => r.view) : []))
const verdict = computed(() => verdicts(ballots.value, BRUNO, schulze.value?.winner ?? null))
const done = computed(() => schulze.value?.winner === CAMILLE && schulze.value.decisive && pairwise.value?.cycle !== null)

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
}
</script>

<template>
  <TownFrame :title="t('journey.steps.fakeCycle')" :seen="['plurality', 'two_round', 'irv', 'borda', 'schulze']" current="schulze">
    <template #story>
      <RichText tag="p" :text="t('t12.paradox')" />
      <RichText tag="p" :text="t('t12.manufacture')" />
      <Challenge id="t12" :done="done">
        {{ t('t12.challenge') }}
        <template #success>{{ t('t12.success') }}</template>
      </Challenge>
      <div class="card">
        <PersonaLieFinder method="schulze" :ballots="honestBallots()" @apply="setBallot" />
      </div>
      <Takeaway after="t12">
        <p>{{ t('t12.lesson') }}</p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <DuelGraph v-if="pairwise" :names="NAMES" :pairwise="pairwise" />
      </div>
      <WinnerStrip v-if="outcomes.length" :outcomes="outcomes" :names="NAMES" />
    </template>
    <template #town>
      <CandidateBar :winner="schulze?.winner" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="ranked"
          :editable="i === ANA"
          :verdict="verdict[i]"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
