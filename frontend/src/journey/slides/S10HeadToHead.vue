<script setup lang="ts">
import { computed, ref } from 'vue'
import Challenge from '../../components/Challenge.vue'
import DuelGraph from '../../components/DuelGraph.vue'
import DuelMatrix from '../../components/DuelMatrix.vue'
import SpatialMap from '../../components/SpatialMap.vue'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { favourites, model, resultFor, useSpatial } from '../../composables/useApi'
import type { Crowd, SpatialCandidate } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const candidates = ref<SpatialCandidate[]>([
  { name: 'Ada', x: 0.2, y: 0.4 },
  { name: 'Bea', x: 0.5, y: 0.5 },
  { name: 'Cal', x: 0.8, y: 0.4 },
])
const crowds = ref<Crowd[]>([
  { x: 0.22, y: 0.42, spread: 0.14, count: 40 },
  { x: 0.5, y: 0.58, spread: 0.12, count: 33 },
  { x: 0.8, y: 0.42, spread: 0.12, count: 27 },
])
const names = computed(() => candidates.value.map((c) => c.name))
const { data } = useSpatial(() => model({ candidates: candidates.value, crowds: crowds.value }), ['plurality', 'irv', 'borda'])
const pairwise = computed(() => data.value?.pairwise ?? null)
const cw = computed(() => pairwise.value?.condorcet_winner ?? null)
const winner = (m: 'plurality' | 'irv') => resultFor(data.value, m)?.outcome
const missed = computed(() => {
  const p = winner('plurality')
  const i = winner('irv')
  return cw.value !== null && !!p && !!i && p.winner !== cw.value && i.winner !== cw.value && !p.used_tiebreak && !i.used_tiebreak
})
const showMatrix = ref(false)
</script>

<template>
  <SlideFrame title="One on one">
    <template #story>
      <p>
        In 1785 the Marquis de Condorcet suggested the most natural test of all: pit every pair of candidates
        against each other. Who would a majority prefer, Ada or Bea? Bea or Cal? Ada or Cal?
      </p>
      <p>
        A candidate who wins <strong>every</strong> one-on-one contest is the <strong>Condorcet winner</strong>.
        Whoever else you elect, a majority of voters would have preferred the Condorcet winner. That is hard to
        defend.
      </p>
      <p class="small">
        The diagram shows every contest as an arrow from winner to loser. The ringed candidate beats everyone.
      </p>
      <Challenge id="s10" :done="missed">
        Drag candidates or crowds until <strong>both</strong> plurality and instant runoff elect someone other
        than the Condorcet winner.
        <template #success>Neither method ever looks at head-to-head results, so neither can promise to find the Condorcet winner.</template>
      </Challenge>
      <Takeaway after="s10">
        <p>
          Methods that always elect the Condorcet winner when there is one are called <strong>Condorcet
          methods</strong>. Plurality, instant runoff and Borda are not among them.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <SpatialMap
        v-model:candidates="candidates"
        v-model:crowds="crowds"
        :points="data?.voters ?? []"
        :colors="favourites(data, 'plurality')"
        :winner="cw"
      />
      <div v-if="pairwise" class="card">
        <DuelGraph :names="names" :pairwise="pairwise" />
        <button class="btn small" @click="showMatrix = !showMatrix">{{ showMatrix ? 'Hide' : 'Show' }} the full table</button>
        <DuelMatrix v-if="showMatrix" :names="names" :pairwise="pairwise" />
      </div>
      <WinnerStrip v-if="data" :outcomes="data.results.map((r) => r.outcome)" :names="names" :condorcet="cw" show-condorcet />
    </template>
  </SlideFrame>
</template>
