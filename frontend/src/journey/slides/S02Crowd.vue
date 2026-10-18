<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Challenge from '../../components/Challenge.vue'
import Predict from '../../components/Predict.vue'
import SpatialMap from '../../components/SpatialMap.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { favourites, model, resultFor, useSpatial } from '../../composables/useApi'
import type { Crowd, SpatialCandidate } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const candidates = ref<SpatialCandidate[]>([
  { name: 'Ada', x: 0.24, y: 0.32 },
  { name: 'Bea', x: 0.72, y: 0.3 },
  { name: 'Cal', x: 0.62, y: 0.78 },
])
const crowds = ref<Crowd[]>([{ x: 0.48, y: 0.5, spread: 0.32, count: 150 }])
const names = computed(() => candidates.value.map((c) => c.name))
const guess = ref<number | null>(null)
const { data } = useSpatial(() => model({ candidates: candidates.value, crowds: crowds.value }), ['plurality'])
const result = computed(() => resultFor(data.value, 'plurality'))
const revealed = computed(() => guess.value !== null)
// The prediction is about the starting position, so remember the first answer.
const firstWinner = ref<number | null>(null)
watch(result, (r) => {
  if (firstWinner.value === null && r) firstWinner.value = r.outcome.winner
})
const colors = computed(() => (revealed.value ? favourites(data.value, 'plurality') : []))
</script>

<template>
  <SlideFrame title="Everybody votes">
    <template #story>
      <p>
        One voter is a story; an election is a crowd. Each dot on the map is a voter, and each one likes the
        nearest candidate best.
      </p>
      <p>
        Under <strong>plurality</strong>, the rule used for most elections in the UK, the US, Canada and India,
        every voter marks a single name and the name with the most marks wins. No majority needed.
      </p>
      <Predict v-model="guess" question="Before we count: who do you think gets the most votes?" :options="names" :answer="firstWinner" />
      <template v-if="revealed">
        <Challenge id="s2" :done="result?.outcome.winner === 2 && !result.outcome.used_tiebreak">
          You are Cal's campaign manager. Drag <strong>Cal</strong> (only Cal can move) to a spot where Cal wins.
          <template #success>Moving towards the crowd works. Remember that: candidates crowd the middle for a reason.</template>
        </Challenge>
        <Takeaway after="s2">
          <p>Plurality only looks at each voter's favourite. Everything else they think is thrown away.</p>
        </Takeaway>
      </template>
    </template>
    <template #stage>
      <SpatialMap
        v-model:candidates="candidates"
        :crowds="crowds"
        :crowds-movable="false"
        :points="data?.voters ?? []"
        :colors="colors"
        :movable="revealed ? [2] : 'none'"
        :winner="revealed ? result?.outcome.winner : null"
      />
      <TallyBars
        v-if="revealed && result"
        :names="names"
        :tallies="result.outcome.rounds[0].tallies"
        :winner="result.outcome.winner"
        unit="votes"
      />
      <p v-else class="muted small">Make a prediction to count the votes.</p>
    </template>
  </SlideFrame>
</template>
