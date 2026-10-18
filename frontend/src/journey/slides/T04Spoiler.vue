<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { BRUNO, honestBallots, NAMES } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const ballots = honestBallots()
const withdrawn = ref<number[]>([])
const { results } = useTown(() => ballots, () => ({ withdrawn: withdrawn.value }), ['plurality'])
const { results: honest } = useTown(() => ballots, () => ({}), ['plurality'])
const plurality = computed(() => results.value?.byMethod.plurality ?? null)
const spoilers = computed(() => honest.value?.byMethod.plurality.spoilers ?? [])
const spoilerText = computed(() =>
  spoilers.value.map((s) => `without ${NAMES[s.candidate]}, ${NAMES[s.winnerWithout]} would win`).join('; '),
)
const done = computed(() => withdrawn.value.length === 1 && plurality.value?.winner === BRUNO && plurality.value.decisive)
</script>

<template>
  <TownFrame title="The spoiler" :seen="['plurality']" current="plurality">
    <template #story>
      <p>
        Now a different experiment. Nobody changes their ballot, but one candidate <strong>withdraws</strong> before
        the vote. Every voter who had marked them moves their mark to the next name on their list.
      </p>
      <p>A candidate who can't win but still decides who does is called a <strong>spoiler</strong>.</p>
      <Challenge id="t4" :done="done">
        Withdraw a single candidate so that Bruno, everybody's reliable second choice, becomes mayor.
        <template #success>
          Without Amira, Leo's 7 votes go to Bruno, who beats Erik 10 to 9. Without meaning to, Amira was the best
          thing that happened to Erik's campaign.
        </template>
      </Challenge>
      <p v-if="done" class="small">
        In the 2000 US presidential election, George W. Bush won Florida, and with it the White House, by 537 votes.
        Ralph Nader, whose voters mostly preferred Al Gore to Bush, won over 97,000 votes there.
      </p>
      <Takeaway after="t4">
        <p>
          In this election {{ spoilers.length }} candidates are spoilers:
          {{ spoilerText }}.
          Want to beat a rival under plurality? Help a look-alike of theirs get on the ballot.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">Plurality count, live</div>
        <TallyBars v-if="plurality" :names="NAMES" :tallies="plurality.rounds[0].tallies" :winner="plurality.winner" unit="votes" />
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
