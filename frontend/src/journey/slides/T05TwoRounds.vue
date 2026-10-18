<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import Predict from '../../components/Predict.vue'
import RoundsView from '../../components/RoundsView.vue'
import Takeaway from '../../components/Takeaway.vue'
import { honestBallots, NAMES } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

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
</script>

<template>
  <TownFrame title="Two rounds" :seen="guess !== null ? ['plurality', 'two_round'] : ['plurality']" current="two_round">
    <template #story>
      <p>
        France elects its president with a fix for plurality's problem. If nobody wins a majority, the top two come
        back two weeks later for a <strong>runoff</strong>, and everyone votes again, choosing between just those two.
      </p>
      <p>
        Round one is the plurality count you already know: Erik 9, Amira 7. Nobody has a majority, so Erik and Amira
        go to round two. Each group now marks whichever finalist it ranks higher.
      </p>
      <Predict v-model="guess" question="Who wins the runoff?" :options="options" :answer="answer" />
      <template v-if="guess !== null && twoRound">
        <Challenge id="t5" :done="reachedEnd">
          Look at the runoff column on each ballot below and check the count.
          <template #success>
            {{ NAMES[twoRound.winner] }} wins the runoff
            {{ twoRound.rounds[1].tallies[twoRound.winner] }}–{{
              twoRound.rounds[1].tallies.find((t, c) => t !== null && c !== twoRound!.winner)
            }}. Same voters, second system, second mayor.
          </template>
        </Challenge>
        <Takeaway after="t5">
          <p>
            A runoff can never elect someone a majority would vote against one on one, so Erik, who loses every duel,
            is safe from winning. But a runoff only ever looks at two names, chosen by a plurality count, with all its
            flaws.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <RoundsView v-if="twoRound && guess !== null" v-model:step="step" :outcome="twoRound.view" :names="NAMES" unit="votes" />
        <p v-else class="muted small">Make a prediction to hold round two.</p>
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
