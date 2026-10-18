<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import PersonaLieFinder from '../../components/PersonaLieFinder.vue'
import Predict from '../../components/Predict.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { BRUNO, defaultApprovals, honestBallots, NAMES, PERSONAS, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'
import { verdicts } from '../town'

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
  <TownFrame title="Tick everyone you'd accept" :seen="seen" current="approval">
    <template #story>
      <p>
        Rankings are a lot to ask. <strong>Approval voting</strong> asks for less: tick every candidate you would be
        happy with. Most ticks wins. Fargo, North Dakota and St. Louis, Missouri elect their city officials this way.
      </p>
      <p>Each group here ticks its top two.</p>
      <Predict v-model="guess" question="Who gets the most ticks?" :options="NAMES" :answer="firstWinner" />
      <template v-if="guess !== null && approval">
        <p>
          Bruno, again: for the first time two systems agree. Approval and the head-to-head count both pick the
          candidate nobody hates. Now the dilemma: should a group tick its second choice at all? A tick for your
          second choice might help them beat your first.
        </p>
        <Challenge id="t13" :done="backfired">
          Make a group <strong>bullet vote</strong>: untick everything on its ballot except its favourite. Find a
          group for whom that backfires.
          <template #success>
            Without the ticks for Bruno, Daniel wins, and Frank and Leo both rank Daniel fourth. The safe-looking bullet
            vote handed them a worse mayor.
          </template>
        </Challenge>
        <div class="card">
          <p class="small">Can any group rig approval voting here? Ask the machine:</p>
          <PersonaLieFinder method="approval" :ballots="honest()" :applicable="false" />
        </div>
        <Takeaway after="t13">
          <p>
            Approval has no spoilers: ticking one more name never takes a tick from anyone else. Its strategy problem
            is where to draw the line. In Riverton nobody can gain by moving it, but in a closer race the groups backing
            two similar candidates face a game of chicken: whoever stops ticking the other first may win, or lose both.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">Ticks</div>
        <TallyBars v-if="guess !== null && approval" :names="NAMES" :tallies="approval.rounds[0].tallies" :winner="approval.winner" unit="ticks" sorted />
        <p v-else class="muted small">Make a prediction to count the ticks.</p>
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
