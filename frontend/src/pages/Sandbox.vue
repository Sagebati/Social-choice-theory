<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Announce from '../components/Announce.vue'
import DuelGraph from '../components/DuelGraph.vue'
import MapLegend from '../components/MapLegend.vue'
import ManipulationFinder from '../components/ManipulationFinder.vue'
import RichText from '../components/RichText'
import RoundsView from '../components/RoundsView.vue'
import SpatialMap from '../components/SpatialMap.vue'
import { favourites, changed, model, resultFor, useSpatial, useYee } from '../composables/useApi'
import { activeChoice, ALL_METHODS, BALLOT_KIND, eliminatedBefore, methodName, NAMES, simplifyFor, winnerName } from '../election'
import { listOf } from '../i18n'
import { color } from '../palette'
import type { Crowd, Election, MethodId, SpatialCandidate } from '../types'

// Everything from the journey on one map: as many candidates and crowds as you
// like, every method side by side.
const { t, n } = useI18n()
const candidates = ref<SpatialCandidate[]>([
  { name: 'Ada', x: 0.25, y: 0.3 },
  { name: 'Bea', x: 0.52, y: 0.55 },
  { name: 'Cal', x: 0.78, y: 0.32 },
  { name: 'Dee', x: 0.45, y: 0.85 },
])
const crowds = ref<Crowd[]>([
  { x: 0.28, y: 0.35, spread: 0.18, count: 60 },
  { x: 0.74, y: 0.36, spread: 0.15, count: 45 },
  { x: 0.5, y: 0.72, spread: 0.14, count: 35 },
])
const strategic = ref(0)
const useRadius = ref(false)
const radius = ref(0.3)
const methods = ref<MethodId[]>(['plurality', 'irv', 'borda', 'schulze', 'approval', 'star'])
const primary = ref<MethodId>('plurality')
const showYee = ref(false)
const selected = ref<{ kind: 'candidate' | 'crowd'; index: number } | null>(null)
const step = ref(0)

const current = computed(() =>
  model({
    candidates: candidates.value,
    crowds: crowds.value,
    strategic: strategic.value,
    approval_radius: useRadius.value ? radius.value : null,
  }),
)
const requested = computed(() => (methods.value.includes(primary.value) ? methods.value : [primary.value, ...methods.value]))
const { data, error, loading } = useSpatial(() => current.value, () => requested.value)
const { data: yee, error: yeeError } = useYee(() => (showYee.value ? current.value : null), () => primary.value)

const names = computed(() => candidates.value.map((c) => c.name))
const main = computed(() => resultFor(data.value, primary.value))
watch(primary, () => (step.value = 0))

// Ranked-ballot counts recolour voters as their ballots transfer between rounds.
const byRound = computed(() => ['irv', 'coombs', 'two_round'].includes(primary.value))
const colors = computed(() => {
  const r = main.value
  if (!r) return []
  if (byRound.value) {
    const out = eliminatedBefore(r.outcome, step.value)
    return r.votes.map((v) => activeChoice(v.ballot.ranking, out))
  }
  return favourites(data.value, primary.value)
})
const finderElection = computed(() =>
  main.value ? simplifyFor(BALLOT_KIND[primary.value], main.value.election as Election) : null,
)

const shown = computed(() => data.value?.results.filter((r) => methods.value.includes(r.method)) ?? [])
// Every card's winner in one sentence, read out once a drag settles.
const summary = computed(() =>
  shown.value
    .map((r) =>
      r.outcome.tied.length > 1
        ? t('sandbox.ties', { method: methodName(r.method), names: listOf(r.outcome.tied.map((c) => names.value[c])) })
        : t('sandbox.wins', { method: methodName(r.method), name: names.value[r.outcome.winner] }),
    )
    .join(' '),
)

function toggleMethod(m: MethodId) {
  methods.value = methods.value.includes(m) ? methods.value.filter((x) => x !== m) : [...methods.value, m]
}

// Candidates are only ever added or removed at the end of the list, so every
// candidate keeps their colour.
function addCandidate() {
  if (candidates.value.length >= 8) return
  const name = NAMES[candidates.value.length]
  candidates.value = [...candidates.value, { name, x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.7 }]
}

function removeCandidate() {
  if (candidates.value.length <= 2) return
  candidates.value = candidates.value.slice(0, -1)
  if (selected.value?.kind === 'candidate') selected.value = null
}

function addCrowd() {
  if (crowds.value.length >= 6) return
  crowds.value = [...crowds.value, { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, spread: 0.12, count: 30 }]
  selected.value = { kind: 'crowd', index: crowds.value.length - 1 }
}

function removeCrowd() {
  const s = selected.value
  if (s?.kind !== 'crowd' || crowds.value.length <= 1) return
  crowds.value = crowds.value.filter((_, i) => i !== s.index)
  selected.value = null
}

const selectedCrowd = computed(() => (selected.value?.kind === 'crowd' ? crowds.value[selected.value.index] : null))
function updateCrowd(patch: Partial<Crowd>) {
  const s = selected.value
  if (s?.kind !== 'crowd') return
  crowds.value = crowds.value.map((c, i) => (i === s.index ? { ...c, ...patch } : c))
}
</script>

<template>
  <div class="sandbox">
    <header class="intro">
      <h1>{{ t('sandbox.title') }}</h1>
      <p class="muted">{{ t('sandbox.intro') }}</p>
    </header>

    <div class="layout">
      <div class="left">
        <div class="map-wrap">
          <SpatialMap
            v-model:candidates="candidates"
            v-model:crowds="crowds"
            :points="data?.voters ?? []"
            :colors="colors"
            :rings="changed(data, primary)"
            :winner="main?.outcome.winner"
            :yee="showYee ? yee : null"
            :selected="selected"
            :label="t('sandbox.mapLabel')"
            @select="selected = $event"
          />
        </div>
        <div class="row tools">
          <button class="btn small" :disabled="candidates.length >= 8" @click="addCandidate">{{ t('sandbox.addCandidate') }}</button>
          <button class="btn small" :disabled="candidates.length <= 2" @click="removeCandidate">− {{ candidates[candidates.length - 1].name }}</button>
          <button class="btn small" :disabled="crowds.length >= 6" @click="addCrowd">{{ t('sandbox.addCrowd') }}</button>
          <label class="row small">
            <input v-model="showYee" type="checkbox" /> {{ t('sandbox.yee', { method: methodName(primary) }) }}
          </label>
        </div>
        <div v-if="selectedCrowd" class="card crowd-edit">
          <div class="row">
            <span class="eyebrow">{{ t('sandbox.selectedCrowd') }}</span>
            <button class="btn small" :disabled="crowds.length <= 1" @click="removeCrowd">{{ t('sandbox.removeCrowd') }}</button>
          </div>
          <label class="small">
            {{ t('sandbox.crowdVoters', { n: selectedCrowd.count }) }}
            <input type="range" min="1" max="200" :value="selectedCrowd.count" @input="updateCrowd({ count: Number(($event.target as HTMLInputElement).value) })" />
          </label>
          <label class="small">
            {{ t('sandbox.spread', { value: n(selectedCrowd.spread, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }) }}
            <input type="range" min="0" max="0.45" step="0.01" :value="selectedCrowd.spread" @input="updateCrowd({ spread: Number(($event.target as HTMLInputElement).value) })" />
          </label>
        </div>
        <MapLegend
          v-if="data"
          :names="names"
          :colors="colors"
          :rings="changed(data, primary)"
          :yee="showYee ? yee : null"
          :method="methodName(primary)"
          :by-round="byRound"
        />
        <p v-if="showYee && yeeError" class="notice" role="alert">{{ t('sandbox.yeeError', { error: yeeError }) }}</p>
      </div>

      <div class="right">
        <div class="card stack">
          <label class="small">
            <RichText :text="t('sandbox.strategic', { share: n(strategic, { style: 'percent' }) })" />
            <input v-model.number="strategic" type="range" min="0" max="1" step="0.05" />
          </label>
          <label class="row small"><input v-model="useRadius" type="checkbox" /> {{ t('sandbox.useRadius') }}</label>
          <label v-if="useRadius" class="small">
            {{ t('sandbox.radius', { value: n(radius, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }) }}
            <input v-model.number="radius" type="range" min="0.05" max="0.8" step="0.01" />
          </label>
          <p v-else class="small muted">{{ t('sandbox.defaultApproval') }}</p>
          <div>
            <div class="eyebrow">{{ t('sandbox.compare') }}</div>
            <div class="row methods">
              <button
                v-for="m in ALL_METHODS"
                :key="m"
                class="btn small"
                :class="{ primary: methods.includes(m) }"
                :aria-pressed="methods.includes(m)"
                @click="toggleMethod(m)"
              >
                {{ methodName(m) }}
              </button>
            </div>
          </div>
        </div>

        <p v-if="error" class="notice" role="alert">{{ t('common.resultsError', { error }) }}</p>
        <Announce v-if="data" :text="summary" />
        <div v-if="data" class="results" :aria-busy="loading">
          <button
            v-for="r in shown"
            :key="r.method"
            class="result"
            :class="{ active: r.method === primary }"
            :aria-pressed="r.method === primary"
            @click="primary = r.method"
          >
            <span class="m">{{ methodName(r.method) }}</span>
            <span class="w">
              <span v-if="r.outcome.tied.length === 1" class="sw" :style="{ background: color(r.outcome.winner) }" />
              {{ winnerName(names, r.outcome) }}
            </span>
            <span v-if="r.spoilers.length" class="small spoil">
              {{ t('sandbox.spoiling', { names: r.spoilers.map((s) => names[s.candidate]).join(', ') }) }}
            </span>
            <span
              v-if="data.pairwise.condorcet_winner !== null && r.outcome.winner !== data.pairwise.condorcet_winner"
              class="small muted"
            >
              {{ t('sandbox.notCondorcet') }}
            </span>
          </button>
        </div>

        <div v-if="main" class="card" :aria-busy="loading">
          <RoundsView v-model:step="step" :outcome="main.outcome" :names="names" />
        </div>
        <div v-if="data" class="card" :aria-busy="loading">
          <div class="eyebrow">{{ t('sandbox.headToHead') }}</div>
          <DuelGraph :names="names" :pairwise="data.pairwise" />
        </div>
        <div v-if="finderElection" class="card">
          <div class="eyebrow">{{ t('sandbox.canLie', { method: methodName(primary) }) }}</div>
          <ManipulationFinder :election="finderElection" :method="primary" :applicable="false" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.intro p {
  max-width: 46rem;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.left {
  position: sticky;
  top: 4.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.right {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tools {
  justify-content: flex-start;
}

.crowd-edit {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.methods {
  gap: 0.35rem;
}

.results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.5rem;
}

.result {
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.5rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.result.active {
  outline: 2px solid var(--ink);
}

.m {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-2);
}

.w {
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.sw {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.spoil {
  color: var(--bad);
}

@media (max-width: 860px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .left {
    position: static;
  }
}
</style>
