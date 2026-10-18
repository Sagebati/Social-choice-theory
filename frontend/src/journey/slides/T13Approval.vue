<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import PersonaLieFinder from '../../components/PersonaLieFinder.vue'
import Predict from '../../components/Predict.vue'
import RichText from '../../components/RichText'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { BRUNO, defaultApprovals, honestBallots, NAMES, PERSONAS, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'
import { verdicts } from '../town'

const { t } = useI18n()

// Each group honestly approves its top two.
const honest = (): CastBallot[] => honestBallots().map((b) => ({ ...b, approvals: defaultApprovals(b.ranking) }))
const ballots = ref<CastBallot[]>(honest())
const { results } = useTown(() => ballots.value, () => ({}), ['approval'])
const approval = computed(() => results.value?.byMethod.approval ?? null)
const guess = ref<number | null>(null)
// Ballots stay honest until the prediction is made, so the first answer is the honest one.
const firstWinner = ref<number | null>(null)
watch(approval, (a) => {
  if (firstWinner.value === null && a) firstWinner.value = a.winner
})
const verdict = computed(() => verdicts(ballots.value, BRUNO, approval.value?.winner ?? null))

// A bullet vote: a group ticks only its favourite.
const bullets = computed(() =>
  ballots.value
    .map((b, g) => ({ b, g }))
    .filter(({ b, g }) => b.approvals && b.approvals.filter(Boolean).length === 1 && b.approvals[PERSONAS[g].ranking[0]])
    .map(({ g }) => g),
)
const backfired = computed(
  () => bullets.value.length > 0 && !!approval.value?.decisive && bullets.value.some((g) => verdict.value[g] === 'worse'),
)
const seen = computed(() =>
  (guess.value !== null ? ['plurality', 'two_round', 'irv', 'borda', 'schulze', 'approval'] : ['plurality', 'two_round', 'irv', 'borda', 'schulze']) as (
    | 'plurality'
    | 'two_round'
    | 'irv'
    | 'borda'
    | 'schulze'
    | 'approval'
  )[],
)

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
}
</script>

<template>
  <TownFrame :title="t('journey.steps.approval')" :seen="seen" current="approval">
    <template #story>
      <RichText tag="p" :text="t('t13.intro')" />
      <p>{{ t('t13.topTwo') }}</p>
      <Predict v-model="guess" :question="t('t13.question')" :options="NAMES" :answer="firstWinner" />
      <template v-if="guess !== null && approval">
        <p>{{ t('t13.dilemma') }}</p>
        <Challenge id="t13" :done="backfired">
          <RichText :text="t('t13.challenge')" />
          <template #success>{{ t('t13.success') }}</template>
        </Challenge>
        <div class="card">
          <p class="small">{{ t('t13.askMachine') }}</p>
          <PersonaLieFinder method="approval" :ballots="honest()" :applicable="false" />
        </div>
        <Takeaway after="t13">
          <p>{{ t('t13.lesson') }}</p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">{{ t('t13.ticks') }}</div>
        <TallyBars
          v-if="guess !== null && approval"
          :names="NAMES"
          :tallies="approval.rounds[0].tallies"
          :winner="approval.winner"
          :unit="t('t13.unit')"
          sorted
        />
        <p v-else class="muted small">{{ t('t13.waiting') }}</p>
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="guess !== null ? approval?.winner : null" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="approval"
          :editable="guess !== null"
          :verdict="verdict[i]"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
