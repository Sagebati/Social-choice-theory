<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '../api'
import ArrowLab from '../components/ArrowLab.vue'
import CriteriaTable from '../components/CriteriaTable.vue'
import DuelGraph from '../components/DuelGraph.vue'
import ManipulabilityChart from '../components/ManipulabilityChart.vue'
import ProfileEditor from '../components/ProfileEditor.vue'
import WinnerStrip from '../components/WinnerStrip.vue'
import { useElect } from '../composables/useApi'
import { useLive } from '../composables/useLive'
import { ALL_METHODS, rankingsOnly } from '../election'
import type { ElectionInput, RuleId } from '../types'

const allRules: RuleId[] = [...ALL_METHODS, 'pairwise_majority']

// Manipulability sweep: only runs when asked, it is the heaviest request.
const sweep = ref<{ candidates: number } | null>(null)
const sweepCandidates = ref(3)
const { data: manipulability, loading: sweeping, error: sweepError } = useLive(
  () => sweep.value,
  (q) => api.manipulability(ALL_METHODS, q.candidates, 120),
)

// Same ballots, fifteen answers.
const election = ref<ElectionInput>({
  candidates: ['Ada', 'Bea', 'Cal', 'Dee'],
  ballots: [
    { weight: 12, ranking: [0, 1, 2, 3] },
    { weight: 10, ranking: [1, 2, 3, 0] },
    { weight: 8, ranking: [2, 3, 1, 0] },
    { weight: 7, ranking: [3, 1, 2, 0] },
    { weight: 4, ranking: [2, 0, 1, 3] },
  ],
})
const { data } = useElect(() => election.value, ALL_METHODS)
const names = computed(() => election.value.candidates)
const distinct = computed(() => new Set(data.value?.results.map((r) => (r.outcome.tied.length > 1 ? 'tie' : r.outcome.winner))).size)
let seed = 1

async function shuffle() {
  seed += 1
  election.value = rankingsOnly(await api.random(4, 5, seed))
}
</script>

<template>
  <div class="lab">
    <header>
      <h1>Theorem lab</h1>
      <p class="muted">
        The machinery behind the journey, with every knob exposed. Everything here is computed on the server by the
        Rust library, by brute force where possible.
      </p>
    </header>

    <section class="card">
      <h2>Same ballots, many winners</h2>
      <p>
        Edit the ballots, or shuffle in a random election. This one currently has
        <strong>{{ distinct }}</strong> different outcomes across the {{ ALL_METHODS.length }} methods.
      </p>
      <div class="split">
        <div class="stack">
          <div class="row">
            <button class="btn small" @click="shuffle">Random election</button>
          </div>
          <ProfileEditor v-model="election" structural />
        </div>
        <DuelGraph v-if="data" :names="names" :pairwise="data.pairwise" />
      </div>
      <WinnerStrip v-if="data" :outcomes="data.results.map((r) => r.outcome)" :names="names" :condorcet="data.pairwise.condorcet_winner" show-condorcet />
    </section>

    <section class="card">
      <h2>Arrow's theorem, by brute force</h2>
      <p>
        Pick a rule. The server builds every possible election with three candidates and the chosen number of voters,
        and checks Arrow's four conditions on each. If a condition fails, you get the most telling counterexample.
      </p>
      <ArrowLab :rules="allRules" />
    </section>

    <section class="card">
      <h2>Fairness criteria</h2>
      <p>
        Which method guarantees what. Every ✗ is backed by a real counterexample: click one and the server searches
        random elections until it finds an election that breaks the rule, then shrinks it.
      </p>
      <CriteriaTable />
    </section>

    <section class="card">
      <h2>How manipulable is each method?</h2>
      <p>
        For each random election, the server tries every possible insincere ballot for every bloc of voters and
        checks whether any of them would get a result the bloc prefers.
      </p>
      <div class="row">
        <label class="row small">
          Candidates
          <select v-model.number="sweepCandidates">
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
        </label>
        <button class="btn primary small" :disabled="sweeping" @click="sweep = { candidates: sweepCandidates }">
          {{ sweeping ? 'Running…' : 'Run the experiment' }}
        </button>
      </div>
      <p v-if="sweepError" class="notice">{{ sweepError }}</p>
      <ManipulabilityChart v-if="manipulability" :data="manipulability" />
    </section>
  </div>
</template>

<style scoped>
.lab {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.lab section > p {
  max-width: 48rem;
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 860px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
