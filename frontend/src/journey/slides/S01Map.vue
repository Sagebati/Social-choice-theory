<script setup lang="ts">
import { computed, ref } from 'vue'
import BallotCard from '../../components/BallotCard.vue'
import Challenge from '../../components/Challenge.vue'
import SpatialMap from '../../components/SpatialMap.vue'
import Takeaway from '../../components/Takeaway.vue'
import { model, resultFor, useSpatial } from '../../composables/useApi'
import type { Point, SpatialCandidate } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const candidates = ref<SpatialCandidate[]>([
  { name: 'Ada', x: 0.25, y: 0.3 },
  { name: 'Bea', x: 0.74, y: 0.3 },
  { name: 'Cal', x: 0.5, y: 0.78 },
])
const you = ref<Point[]>([{ x: 0.3, y: 0.52 }])
const names = computed(() => candidates.value.map((c) => c.name))
const { data } = useSpatial(() => model({ candidates: candidates.value, voters: you.value }), ['plurality'])
const ballot = computed(() => resultFor(data.value, 'plurality')?.votes[0]?.ballot ?? null)
const favourite = computed(() => ballot.value?.ranking[0] ?? null)
</script>

<template>
  <SlideFrame title="Where do you stand?">
    <template #story>
      <p>
        Every election starts with something nobody can see: what the voters actually want. So let's draw it.
      </p>
      <p>
        The square on the right is a map of opinions. Left to right might be taxes, top to bottom the environment;
        it doesn't matter. Each candidate stands somewhere on it. So do you.
      </p>
      <p>The only rule of the map: <strong>the closer a candidate stands to you, the more you like them.</strong></p>
      <Challenge id="s1" :done="favourite === 1">
        Drag <strong>You</strong> around the map until you would vote for <strong>Bea</strong>.
        <template #success>Notice the solid line: it always points at your favourite.</template>
      </Challenge>
      <Takeaway after="s1">
        <p>
          This is the <em>spatial model</em> of voting, used by political scientists since the 1950s. It is a
          cartoon, but a useful one: every paradox in this guide happens with honest voters on a map like this.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <SpatialMap v-model:candidates="candidates" v-model:voters="you" movable="none" lines />
      <BallotCard v-if="ballot" :ballot="ballot" :names="names" kind="choose_one" />
      <p class="small muted">Tip: on a keyboard, focus a token with Tab and move it with the arrow keys.</p>
    </template>
  </SlideFrame>
</template>
