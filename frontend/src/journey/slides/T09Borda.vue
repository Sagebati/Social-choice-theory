<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import Predict from '../../components/Predict.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { honestBallots, NAMES } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const ballots = honestBallots()
const { results } = useTown(() => ballots, () => ({}), ['borda'])
const borda = computed(() => results.value?.byMethod.borda ?? null)
const guess = ref<number | null>(null)
const revealed = computed(() => guess.value !== null)
const seen = computed(() => (revealed.value ? ['plurality', 'two_round', 'irv', 'borda'] : ['plurality', 'two_round', 'irv']) as ('plurality' | 'two_round' | 'irv' | 'borda')[])
</script>

<template>
  <TownFrame title="Points for every place" :seen="seen" current="borda">
    <template #story>
      <p>
        Runoffs throw ballots around one name at a time. In 1770 the mathematician Jean-Charles de Borda proposed
        reading the whole ranking at once: give <strong>points</strong>. With five candidates a first place is worth 4
        points, a second 3, then 2, 1 and 0. Most points wins.
      </p>
      <p>The ballots below show what each group's ranking is worth to each candidate.</p>
      <Predict v-model="guess" question="Who collects the most points?" :options="NAMES" :answer="borda?.winner ?? null" />
      <template v-if="revealed && borda">
        <Challenge id="t9" :done="revealed">
          Compare the count with the ballots.
          <template #success>
            Camille is nobody's last choice and in everyone's top three except Margaret's, and edges out Bruno 74 to 72.
            Fourth system, fourth mayor.
          </template>
        </Challenge>
        <Takeaway after="t9">
          <p>
            Borda rewards candidates many people find acceptable, even if few love them. Notice that Bruno, who beats
            every rival one on one, still comes second: points and duels don't agree.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">Borda points</div>
        <TallyBars v-if="revealed && borda" :names="NAMES" :tallies="borda.rounds[0].tallies" :winner="borda.winner" unit="points" sorted />
        <p v-else class="muted small">Make a prediction to add up the points.</p>
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
