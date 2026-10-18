<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BallotCard from '../../components/BallotCard.vue'
import Challenge from '../../components/Challenge.vue'
import SpatialMap from '../../components/SpatialMap.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { favourites, model, resultFor, useSpatial } from '../../composables/useApi'
import type { Crowd, Point, SpatialCandidate } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const candidates = ref<SpatialCandidate[]>([
  { name: 'Ada', x: 0.28, y: 0.38 },
  { name: 'Bea', x: 0.52, y: 0.6 },
  { name: 'Cal', x: 0.78, y: 0.36 },
])
const crowds = ref<Crowd[]>([
  { x: 0.25, y: 0.4, spread: 0.14, count: 38 },
  { x: 0.78, y: 0.38, spread: 0.13, count: 34 },
  { x: 0.52, y: 0.66, spread: 0.1, count: 18 },
])
const you = ref<Point[]>([{ x: 0.45, y: 0.45 }])
const radius = ref(0.15)
const names = computed(() => candidates.value.map((c) => c.name))
const { data } = useSpatial(
  () => model({ candidates: candidates.value, crowds: crowds.value, voters: you.value, approval_radius: radius.value }),
  ['approval'],
)
const result = computed(() => resultFor(data.value, 'approval'))
const winner = computed(() => (result.value && !result.value.outcome.used_tiebreak ? result.value.outcome.winner : null))
const seen = ref(new Set<number>())
watch(winner, (w) => {
  if (w !== null) seen.value = new Set([...seen.value, w])
})
</script>

<template>
  <SlideFrame title="Approve of many">
    <template #story>
      <p>
        Ranking ballots got complicated. Here is a simpler idea: let voters tick <strong>every</strong> candidate
        they find acceptable. Most ticks wins. That's <strong>approval voting</strong>, used for city elections in
        Fargo, North Dakota and St. Louis, Missouri.
      </p>
      <p>
        On the map, each voter approves every candidate within a certain distance. The circle shows yours.
      </p>
      <label class="slider">
        <span>How tolerant are voters? Approval radius <strong>{{ radius.toFixed(2) }}</strong></span>
        <input v-model.number="radius" type="range" min="0.05" max="0.6" step="0.01" aria-label="Approval radius" />
      </label>
      <Challenge id="s13" :done="seen.has(0) && seen.has(1)">
        Find a radius where <strong>Ada</strong> wins, and one where <strong>Bea</strong> wins.
        <template #success>
          Same voters, same opinions, different winner, depending only on where people draw the line.
        </template>
      </Challenge>
      <Takeaway after="s13">
        <p>
          Approval can't have a spoiler, since ticking an extra name never takes a tick away from anyone else. But
          every voter must decide <em>where</em> to draw the line, and that is a strategic decision. Approve only
          your favourite (<strong>bullet voting</strong>) and you might hand the race to your least favourite;
          approve your second choice too and you might help them beat your first.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <SpatialMap
        v-model:candidates="candidates"
        v-model:crowds="crowds"
        v-model:voters="you"
        :points="data?.voters ?? []"
        :colors="favourites(data, 'approval')"
        :radius="radius"
        :winner="result?.outcome.winner"
      />
      <div class="row top">
        <BallotCard v-if="result?.votes[0]" :ballot="result.votes[0].ballot" :names="names" kind="approval" />
        <div v-if="result" class="card grow">
          <div class="eyebrow">Approvals</div>
          <TallyBars :names="names" :tallies="result.outcome.rounds[0].tallies" :winner="result.outcome.winner" unit="approvals" />
        </div>
      </div>
    </template>
  </SlideFrame>
</template>

<style scoped>
.slider {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.top {
  align-items: flex-start;
}

.grow {
  flex: 1;
  min-width: 14rem;
}
</style>
