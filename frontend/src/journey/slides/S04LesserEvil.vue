<script setup lang="ts">
import { computed, ref } from 'vue'
import Challenge from '../../components/Challenge.vue'
import SpatialMap from '../../components/SpatialMap.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { changed, favourites, model, resultFor, useSpatial } from '../../composables/useApi'
import type { Crowd, SpatialCandidate } from '../../types'
import SlideFrame from '../SlideFrame.vue'

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
const strategic = ref(0)
const names = computed(() => candidates.value.map((c) => c.name))
const { data } = useSpatial(
  () => model({ candidates: candidates.value, crowds: crowds.value, strategic: strategic.value }),
  ['plurality'],
)
const result = computed(() => resultFor(data.value, 'plurality'))
const winner = computed(() => result.value?.outcome.winner ?? null)
const switched = computed(() => changed(data.value, 'plurality').filter(Boolean).length)
const decided = computed(() => result.value?.outcome.used_tiebreak === false)
</script>

<template>
  <SlideFrame title="The lesser evil">
    <template #story>
      <p>
        Cal's supporters have a problem. Cal won't win, and they like Bea a lot more than Ada. If they vote
        honestly, Ada wins.
      </p>
      <p>
        So some of them will hold their nose and vote for Bea, the "lesser evil". Voting for someone other than
        your favourite to stop a worse outcome is called <strong>compromising</strong>.
      </p>
      <label class="slider">
        <span>Strategic voters: <strong>{{ Math.round(strategic * 100) }}%</strong> of everyone</span>
        <input v-model.number="strategic" type="range" min="0" max="1" step="0.05" aria-label="Share of strategic voters" />
      </label>
      <p class="small muted">
        Strategic voters back whichever of the two front-runners they prefer. Ringed dots changed their vote ({{ switched }} so far).
      </p>
      <Challenge id="s4" :done="winner === 1 && decided && strategic <= 0.4">
        Raise the share of strategic voters until Bea wins. How few does it take?
        <template #success>
          A handful of Cal voters betraying their favourite flips the election. Honest Cal voters, meanwhile, are
          throwing their votes away.
        </template>
      </Challenge>
      <Takeaway after="s4">
        <p>
          Plurality punishes honesty. Over time voters abandon third choices, and the system drifts towards two
          big parties. Political scientists call this <strong>Duverger's law</strong>.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <SpatialMap
        v-model:candidates="candidates"
        v-model:crowds="crowds"
        movable="none"
        :crowds-movable="false"
        :points="data?.voters ?? []"
        :colors="favourites(data, 'plurality')"
        :rings="changed(data, 'plurality')"
        :winner="winner"
      />
      <TallyBars v-if="result" :names="names" :tallies="result.outcome.rounds[0].tallies" :winner="winner" unit="votes" />
      <p v-if="result?.outcome.used_tiebreak" class="small muted">Dead heat: a tie-break decides.</p>
    </template>
  </SlideFrame>
</template>

<style scoped>
.slider {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
</style>
