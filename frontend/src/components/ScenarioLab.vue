<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useElect } from '../composables/useApi'
import { methodName, rankingsOnly } from '../election'
import type { Election, ElectionInput, MethodId, Scenario } from '../types'
import DuelGraph from './DuelGraph.vue'
import ManipulationFinder from './ManipulationFinder.vue'
import ProfileEditor from './ProfileEditor.vue'
import WinnerStrip from './WinnerStrip.vue'

// A famous election you can edit, count with several methods and try to rig.
const props = defineProps<{ scenario: Scenario }>()
const election = ref<ElectionInput>(rankingsOnly(props.scenario.election))
const method = ref<MethodId>(props.scenario.methods[0])
watch(
  () => props.scenario,
  (s) => {
    election.value = rankingsOnly(s.election)
    method.value = s.methods[0]
  },
)
const { data } = useElect(() => election.value, () => props.scenario.methods)
const names = computed(() => election.value.candidates)

function apply(e: Election) {
  election.value = rankingsOnly(e)
}
</script>

<template>
  <div class="lab">
    <p>{{ scenario.story }}</p>
    <div class="grid">
      <div class="stack">
        <div class="row">
          <span class="eyebrow">The ballot box</span>
          <button class="btn small" @click="election = rankingsOnly(scenario.election)">Reset</button>
        </div>
        <ProfileEditor v-model="election" structural />
        <WinnerStrip v-if="data" :outcomes="data.results.map((r) => r.outcome)" :names="names" :condorcet="data.pairwise.condorcet_winner" show-condorcet />
      </div>
      <div class="stack">
        <DuelGraph v-if="data" :names="names" :pairwise="data.pairwise" />
        <div>
          <div class="row small">
            Rig it under
            <select v-model="method" aria-label="Method to manipulate">
              <option v-for="m in scenario.methods" :key="m" :value="m">{{ methodName(m) }}</option>
            </select>
          </div>
          <ManipulationFinder :election="election" :method="method" @apply="apply" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 1.25rem;
}

@media (max-width: 860px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
