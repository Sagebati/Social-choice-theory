<script setup lang="ts">
import { computed, ref } from 'vue'
import BallotCard from '../../components/BallotCard.vue'
import Challenge from '../../components/Challenge.vue'
import RoundsView from '../../components/RoundsView.vue'
import SpatialMap from '../../components/SpatialMap.vue'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { changed, favourites, model, resultFor, useSpatial } from '../../composables/useApi'
import type { Crowd, Point, SpatialCandidate } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const candidates = ref<SpatialCandidate[]>([
  { name: 'Ada', x: 0.25, y: 0.45 },
  { name: 'Bea', x: 0.5, y: 0.45 },
  { name: 'Cal', x: 0.82, y: 0.45 },
])
const crowds = ref<Crowd[]>([
  { x: 0.25, y: 0.45, spread: 0.13, count: 50 },
  { x: 0.8, y: 0.45, spread: 0.13, count: 42 },
])
const you = ref<Point[]>([{ x: 0.45, y: 0.3 }])
const strategic = ref(0)
const names = computed(() => candidates.value.map((c) => c.name))
const { data } = useSpatial(
  () => model({ candidates: candidates.value, crowds: crowds.value, voters: you.value, strategic: strategic.value }),
  ['score', 'star'],
)
const score = computed(() => resultFor(data.value, 'score'))
const star = computed(() => resultFor(data.value, 'star'))
const agree = computed(
  () =>
    !!score.value &&
    !!star.value &&
    score.value.outcome.winner === star.value.outcome.winner &&
    !score.value.outcome.used_tiebreak &&
    !star.value.outcome.used_tiebreak,
)
const step = ref(1)
</script>

<template>
  <SlideFrame title="Stars, and the urge to exaggerate">
    <template #story>
      <p>
        <strong>Score voting</strong> asks for more than a tick: rate every candidate from 0 to 5 stars, like a
        restaurant. Highest total wins. Each honest voter here gives their favourite 5 stars, their least favourite
        0, and the rest something in between.
      </p>
      <p>
        Ada's 50 fans like Bea fine, so Bea racks up stars from everyone and wins on points, even though most voters
        prefer Ada to Bea. <strong>STAR voting</strong> (Score Then Automatic Runoff) adds a runoff between the two
        highest scorers, and a ballot counts for whichever finalist it rates higher. STAR elects Ada.
      </p>
      <p>
        But stars invite exaggeration. Why give Bea 3 stars if Bea is the threat? Strategic voters give full marks to
        the front-runner they prefer and zero to the other.
      </p>
      <label class="slider">
        <span>Voters who exaggerate: <strong>{{ Math.round(strategic * 100) }}%</strong></span>
        <input v-model.number="strategic" type="range" min="0" max="1" step="0.05" aria-label="Share of exaggerating voters" />
      </label>
      <Challenge id="s14" :done="agree && strategic > 0">
        Find a share of exaggerators at which Score and STAR agree.
        <template #success>
          Once enough of Ada's fans stop giving Bea any stars, Score flips to Ada. Honest voters who used the whole
          scale simply had less say.
        </template>
      </Challenge>
      <Takeaway after="s14">
        <p>
          Under pure score voting, exaggerating always pays, and once everyone exaggerates it becomes approval
          voting. STAR's runoff takes away part of the reward: give two finalists the same score and your ballot sits
          the runoff out.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <SpatialMap
        v-model:candidates="candidates"
        v-model:crowds="crowds"
        v-model:voters="you"
        :points="data?.voters ?? []"
        :colors="favourites(data, 'score')"
        :rings="changed(data, 'score')"
        :winner="star?.outcome.winner"
      />
      <WinnerStrip v-if="data" :outcomes="data.results.map((r) => r.outcome)" :names="names" />
      <div class="row top">
        <BallotCard v-if="score?.votes[0]" :ballot="score.votes[0].ballot" :names="names" kind="score" title="Your score ballot" />
        <div v-if="star" class="card grow">
          <div class="eyebrow">STAR, round by round</div>
          <RoundsView v-model:step="step" :outcome="star.outcome" :names="names" />
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
  min-width: 16rem;
}
</style>
