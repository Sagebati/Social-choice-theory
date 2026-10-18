<script setup lang="ts">
import { computed, ref } from 'vue'
import Challenge from '../../components/Challenge.vue'
import DuelGraph from '../../components/DuelGraph.vue'
import ProfileEditor from '../../components/ProfileEditor.vue'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { useElect } from '../../composables/useApi'
import type { ElectionInput } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const names = ['Ada', 'Bea', 'Cal']
const buriers = ref(0)
const election = computed<ElectionInput>(() => ({
  candidates: names,
  ballots: [
    { weight: 10, ranking: [0, 1, 2] },
    { weight: 10, ranking: [2, 0, 1] },
    { weight: 15 - buriers.value, ranking: [1, 0, 2] },
    { weight: buriers.value, ranking: [1, 2, 0] },
  ].filter((b) => b.weight > 0),
}))
const { data } = useElect(() => election.value, ['schulze', 'ranked_pairs', 'minimax', 'copeland'])
const pairwise = computed(() => data.value?.pairwise ?? null)
const schulze = computed(() => data.value?.results[0].outcome ?? null)
const rankedPairs = computed(() => data.value?.results[1].outcome ?? null)
</script>

<template>
  <SlideFrame title="Breaking the cycle, and faking one">
    <template #story>
      <p>
        Condorcet methods agree whenever there is a Condorcet winner. They differ only in how they break cycles.
        <strong>Ranked pairs</strong> locks in the biggest majorities first and drops the weakest link of the
        cycle. <strong>Schulze</strong> follows the strongest chains of wins. <strong>Minimax</strong> elects
        whoever's worst defeat is mildest.
      </p>
      <p>
        Here Ada is the honest Condorcet winner. Bea's 15 supporters rank Ada second. To win, they would need a cycle,
        so they make one up: they <strong>bury</strong> Ada at the bottom of their ballots.
      </p>
      <label class="slider">
        <span>Bea voters who bury Ada: <strong>{{ buriers }}</strong> of 15</span>
        <input v-model.number="buriers" type="range" min="0" max="15" aria-label="Number of buriers" />
      </label>
      <Challenge id="s12" :done="buriers === 11 && schulze?.winner === 1">
        Find the <strong>fewest</strong> buriers that hand Bea the win. Watch the arrow between Cal and Ada.
        <template #success>
          At 11, Cal beats Ada 21–14, the cycle's weakest link becomes Ada's 20–15 win over Bea, and Schulze, ranked
          pairs and minimax all drop it. From 8 buriers on there is already a cycle, but Ada survives it until the 11th.
        </template>
      </Challenge>
      <Takeaway after="s12">
        <p>
          Burying works against Condorcet methods, but it is a gamble: the buriers need to know the numbers
          exactly, and if the burial is discovered, Ada's camp can retaliate in kind. Copeland, which just counts
          wins, turns every cycle into a tie.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <div class="card">
        <div class="eyebrow">The ballot box</div>
        <ProfileEditor :model-value="election" lock-rankings lock-weights :highlight="buriers ? [election.ballots.length - 1] : []" />
      </div>
      <div v-if="pairwise" class="card">
        <DuelGraph :names="names" :pairwise="pairwise" />
      </div>
      <WinnerStrip v-if="data" :outcomes="data.results.map((r) => r.outcome)" :names="names" />
      <div v-if="rankedPairs" class="card small">
        <div class="eyebrow">How ranked pairs counts</div>
        <ul class="notes">
          <li v-for="(n, i) in rankedPairs.rounds[0].notes" :key="i">{{ n }}</li>
        </ul>
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

.notes {
  margin: 0;
  padding-left: 1.1rem;
}
</style>
