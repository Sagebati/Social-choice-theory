<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BallotCard from '../../components/BallotCard.vue'
import Challenge from '../../components/Challenge.vue'
import Predict from '../../components/Predict.vue'
import RoundsView from '../../components/RoundsView.vue'
import SpatialMap from '../../components/SpatialMap.vue'
import Takeaway from '../../components/Takeaway.vue'
import { model, resultFor, useSpatial } from '../../composables/useApi'
import { activeChoice, eliminatedBefore } from '../../election'
import type { Crowd, Point, SpatialCandidate } from '../../types'
import SlideFrame from '../SlideFrame.vue'

// Same race as the lesser-evil slide, counted by instant runoff.
const candidates = ref<SpatialCandidate[]>([
  { name: 'Ada', x: 0.24, y: 0.46 },
  { name: 'Bea', x: 0.6, y: 0.4 },
  { name: 'Cal', x: 0.82, y: 0.64 },
])
const crowds = ref<Crowd[]>([
  { x: 0.24, y: 0.5, spread: 0.15, count: 40 },
  { x: 0.58, y: 0.36, spread: 0.12, count: 33 },
  { x: 0.83, y: 0.66, spread: 0.1, count: 27 },
])
const you = ref<Point[]>([{ x: 0.8, y: 0.86 }])
const names = computed(() => candidates.value.map((c) => c.name))
const { data } = useSpatial(() => model({ candidates: candidates.value, crowds: crowds.value, voters: you.value }), ['irv'])
const result = computed(() => resultFor(data.value, 'irv'))
const step = ref(0)
const guess = ref<number | null>(null)
const firstOut = ref<number | null>(null)
const reachedEnd = ref(false)

watch(result, (r) => {
  if (firstOut.value === null && r) firstOut.value = r.outcome.rounds[0].eliminated[0] ?? null
})
watch(step, (s) => {
  if (result.value && s >= result.value.outcome.rounds.length - 1 && result.value.outcome.rounds.length > 1) reachedEnd.value = true
})

// Each dot shows the candidate its ballot currently counts for.
const colors = computed(() => {
  const r = result.value
  if (!r) return []
  const out = eliminatedBefore(r.outcome, step.value)
  return r.votes.map((v) => activeChoice(v.ballot.ranking, out))
})
const out = computed(() => (result.value ? [...eliminatedBefore(result.value.outcome, step.value)] : []))
</script>

<template>
  <SlideFrame title="Rank them all">
    <template #story>
      <p>
        What if the ballot asked for more? On a <strong>ranked ballot</strong> you list every candidate in order:
        first choice, second choice, and so on. Your ballot is on the right; drag yourself around and watch it
        change.
      </p>
      <p>
        <strong>Instant-runoff voting</strong> (IRV, or "ranked-choice voting" in the US) counts first choices. If
        nobody has a majority, the candidate with the fewest is eliminated, and each of their ballots moves to that
        voter's next choice. Repeat until someone has a majority.
      </p>
      <Predict v-model="guess" question="Same race as before. Who gets eliminated first?" :options="names" :answer="firstOut" />
      <template v-if="guess !== null">
        <Challenge id="s5" :done="reachedEnd">
          Step through the count with <strong>Next round</strong> and watch Cal's voters change colour as their
          ballots move.
          <template #success>Cal's voters no longer spoil anything: their ballots flow to Bea, their second choice.</template>
        </Challenge>
        <Takeaway after="s5">
          <p>
            IRV fixes the spoiler from before. Australia has used it for its House of Representatives since 1918.
            But it has blind spots of its own, as the next step shows.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #stage>
      <SpatialMap
        v-model:candidates="candidates"
        v-model:voters="you"
        :crowds="crowds"
        :crowds-movable="false"
        :points="data?.voters ?? []"
        :colors="colors"
        :faded="out"
        :winner="reachedEnd ? result?.outcome.winner : null"
      />
      <div class="row top">
        <BallotCard v-if="result?.votes[0]" :ballot="result.votes[0].ballot" :names="names" kind="ranked" />
        <div v-if="guess !== null && result" class="card rounds">
          <RoundsView v-model:step="step" :outcome="result.outcome" :names="names" unit="votes" />
        </div>
      </div>
    </template>
  </SlideFrame>
</template>

<style scoped>
.top {
  align-items: flex-start;
}

.rounds {
  flex: 1;
  min-width: 16rem;
  padding: 0.9rem;
}
</style>
