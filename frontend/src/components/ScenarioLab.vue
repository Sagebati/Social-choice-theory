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
// A new scenario starts afresh; the same scenario in another language keeps the
// reader's edits.
watch(
  () => props.scenario.id,
  () => {
    election.value = rankingsOnly(props.scenario.election)
    method.value = props.scenario.methods[0]
  },
)
const { data, error, loading } = useElect(() => election.value, () => props.scenario.methods)
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
          <span class="eyebrow">{{ $t('scenarioLab.ballotBox') }}</span>
          <button class="btn small" @click="election = rankingsOnly(scenario.election)">{{ $t('scenarioLab.reset') }}</button>
        </div>
        <ProfileEditor v-model="election" structural />
        <p v-if="error" class="notice" role="alert">{{ $t('common.resultsError', { error }) }}</p>
        <WinnerStrip v-if="data" :aria-busy="loading" :outcomes="data.results.map((r) => r.outcome)" :names="names" :condorcet="data.pairwise.condorcet_winner" show-condorcet />
      </div>
      <div class="stack">
        <DuelGraph v-if="data" :names="names" :pairwise="data.pairwise" :aria-busy="loading" />
        <div>
          <div class="row small">
            {{ $t('scenarioLab.rigUnder') }}
            <select v-model="method" :aria-label="$t('scenarioLab.methodAria')">
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
