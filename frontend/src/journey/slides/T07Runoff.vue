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
  <TownFrame title="Rank them all" :seen="atEnd ? ['plurality', 'two_round', 'irv'] : ['plurality', 'two_round']" current="irv">
    <template #story>
      <p>
        Why make everyone come back for a second round? Ask for a full <strong>ranking</strong> once, and hold all the
        rounds at once. That's <strong>instant-runoff voting</strong> (IRV), called ranked-choice voting in the US.
      </p>
      <p>
        Count first choices. If nobody has a majority, eliminate the candidate with the fewest, and move each of their
        ballots to that voter's next choice still standing. Repeat. Australia has elected its House of
        Representatives this way since 1918.
      </p>
      <Predict
        v-model="guess"
        question="Who is eliminated first?"
        :options="NAMES"
        :answer="irv?.rounds[0].eliminated[0] ?? null"
      />
      <template v-if="guess !== null && irv">
        <Challenge id="t7" :done="atEnd">
          Step through the count with <strong>Next round</strong>. On each ballot below, the outlined name is where
          that group's votes count right now.
          <template #success>
            Bruno, then Camille, then Amira are eliminated, and their voters' ballots pile up on Daniel: 21 of 30.
            Third system, third mayor.
          </template>
        </Challenge>
        <Takeaway after="t7">
          <p>
            Bruno goes out first because almost nobody ranks Bruno first, although Bruno would beat every rival one
            on one. Instant runoff reads more of the ballot than plurality, but at each step it still counts only
            first choices, so a broadly liked candidate with few first choices gets squeezed out. This happened in
            the 2009 mayoral race in Burlington, Vermont, and the city repealed instant runoff the next year.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <RoundsView v-if="irv && guess !== null" v-model:step="step" :outcome="irv.view" :names="NAMES" unit="votes" />
        <p v-else class="muted small">Make a prediction to start the count.</p>
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
