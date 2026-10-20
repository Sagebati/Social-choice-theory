<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import Announce from '../components/Announce.vue'
import ArrowLab from '../components/ArrowLab.vue'
import CriteriaTable from '../components/CriteriaTable.vue'
import DuelGraph from '../components/DuelGraph.vue'
import ManipulabilityChart from '../components/ManipulabilityChart.vue'
import ProfileEditor from '../components/ProfileEditor.vue'
import RichText from '../components/RichText'
import WinnerStrip from '../components/WinnerStrip.vue'
import { useElect } from '../composables/useApi'
import { useLive } from '../composables/useLive'
import { ALL_METHODS, methodName, rankingsOnly } from '../election'
import type { ElectionInput, RuleId } from '../types'

const { t, n } = useI18n()
const allRules: RuleId[] = [...ALL_METHODS, 'pairwise_majority']

// Manipulability sweep: only runs when asked, it is the heaviest request.
const sweep = ref<{ candidates: number } | null>(null)
const sweepCandidates = ref(3)
const { data: manipulability, loading: sweeping, error: sweepError } = useLive(
  () => sweep.value,
  (q) => api.manipulability(ALL_METHODS, q.candidates, 120),
)
// The sweep takes a while: say when it is done, and what it found.
const sweepNews = computed(() => {
  if (sweeping.value) return t('lab.manipulability.running')
  const rows = manipulability.value
  if (!rows?.length) return ''
  const sorted = [...rows].sort((a, b) => b.rate - a.rate)
  const [most, least] = [sorted[0], sorted[sorted.length - 1]]
  const pct = (r: number) => n(r, { style: 'percent' })
  return t('lab.manipulability.done', {
    most: methodName(most.method),
    mostShare: pct(most.rate),
    least: methodName(least.method),
    leastShare: pct(least.rate),
  })
})

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
const { data, error, loading } = useElect(() => election.value, ALL_METHODS)
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
      <h1>{{ t('lab.title') }}</h1>
      <p class="muted">{{ t('lab.intro') }}</p>
    </header>

    <section class="card">
      <h2>{{ t('lab.winners.title') }}</h2>
      <RichText tag="p" :text="t('lab.winners.text', { distinct, methods: ALL_METHODS.length }, distinct)" />
      <Announce v-if="data" :text="t('lab.winners.text', { distinct, methods: ALL_METHODS.length }, distinct)" />
      <p v-if="error" class="notice" role="alert">{{ t('common.resultsError', { error }) }}</p>
      <div class="split">
        <div class="stack">
          <div class="row">
            <button class="btn small" @click="shuffle">{{ t('lab.winners.random') }}</button>
          </div>
          <ProfileEditor v-model="election" structural />
        </div>
        <DuelGraph v-if="data" :names="names" :pairwise="data.pairwise" :aria-busy="loading" />
      </div>
      <WinnerStrip v-if="data" :aria-busy="loading" :outcomes="data.results.map((r) => r.outcome)" :names="names" :condorcet="data.pairwise.condorcet_winner" show-condorcet />
    </section>

    <section class="card">
      <h2>{{ t('lab.arrow.title') }}</h2>
      <p>{{ t('lab.arrow.text') }}</p>
      <ArrowLab :rules="allRules" />
    </section>

    <section class="card">
      <h2>{{ t('lab.criteria.title') }}</h2>
      <p>{{ t('lab.criteria.text') }}</p>
      <CriteriaTable />
    </section>

    <section class="card">
      <h2>{{ t('lab.manipulability.title') }}</h2>
      <p>{{ t('lab.manipulability.text') }}</p>
      <div class="row">
        <label class="row small">
          {{ t('lab.manipulability.candidates') }}
          <select v-model.number="sweepCandidates">
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
        </label>
        <!-- aria-disabled, not disabled: the button keeps focus while the sweep runs. -->
        <button class="btn primary small" :aria-disabled="sweeping" @click="sweeping || (sweep = { candidates: sweepCandidates })">
          {{ sweeping ? t('lab.manipulability.running') : t('lab.manipulability.run') }}
        </button>
      </div>
      <p v-if="sweepError" class="notice" role="alert">{{ t('common.resultsError', { error: sweepError }) }}</p>
      <Announce :text="sweepNews" :delay="100" />
      <ManipulabilityChart v-if="manipulability" :data="manipulability" :aria-busy="sweeping" />
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
