<script setup lang="ts">
import { computed, ref } from 'vue'
import Challenge from '../../components/Challenge.vue'
import SpatialMap from '../../components/SpatialMap.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { favourites, model, resultFor, useSpatial } from '../../composables/useApi'
import type { Crowd, SpatialCandidate } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const candidates = ref<SpatialCandidate[]>([
  { name: 'Ada', x: 0.36, y: 0.5 },
  { name: 'Bea', x: 0.68, y: 0.5 },
])
const crowds = ref<Crowd[]>([
  { x: 0.3, y: 0.45, spread: 0.17, count: 60 },
  { x: 0.74, y: 0.55, spread: 0.15, count: 48 },
])
const entered = computed(() => candidates.value.length === 3)
const names = computed(() => candidates.value.map((c) => c.name))
const { data } = useSpatial(() => model({ candidates: candidates.value, crowds: crowds.value }), ['plurality'])
const result = computed(() => resultFor(data.value, 'plurality'))
const winner = computed(() => result.value?.outcome.winner ?? null)
const deeSpoils = computed(() => result.value?.spoilers.find((s) => s.candidate === 2) ?? null)

function enter() {
  candidates.value = [...candidates.value, { name: 'Dee', x: 0.1, y: 0.9 }]
}
</script>

<template>
  <SlideFrame title="The spoiler">
    <template #story>
      <p>
        Two candidates, two crowds. Ada's crowd is bigger, so Ada wins. Fair enough.
      </p>
      <p>
        Now a third candidate enters the race. Dee has no chance of winning. Dee doesn't need one.
      </p>
      <button v-if="!entered" class="btn primary" @click="enter">Enter Dee</button>
      <template v-else>
        <Challenge id="s3" :done="winner === 1 && deeSpoils !== null">
          Drag <strong>Dee</strong> so that Ada loses, but without Dee winning.
          <template #success>
            Dee won nothing, and still decided the election. Dee is a <strong>spoiler</strong>.
          </template>
        </Challenge>
        <p class="small">
          In the 2000 US presidential election, George W. Bush won Florida, and with it the White House, by 537
          votes. Ralph Nader, whose supporters mostly preferred Al Gore to Bush, won over 97,000 votes there.
        </p>
        <Takeaway after="s3">
          <p>
            Under plurality, similar candidates split their supporters' votes. Want to beat a rival? Help someone
            who looks like them get on the ballot.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #stage>
      <SpatialMap
        v-model:candidates="candidates"
        :crowds="crowds"
        :crowds-movable="false"
        :movable="entered ? [2] : 'none'"
        :points="data?.voters ?? []"
        :colors="favourites(data, 'plurality')"
        :winner="winner"
      />
      <TallyBars v-if="result" :names="names" :tallies="result.outcome.rounds[0].tallies" :winner="winner" unit="votes" />
      <p v-if="deeSpoils" class="notice" role="status">
        ⚠ Spoiler detected: if Dee dropped out, <strong>{{ names[deeSpoils.winner_without] }}</strong> would win instead.
      </p>
    </template>
  </SlideFrame>
</template>
