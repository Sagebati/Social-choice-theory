<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { api } from '../api'
import { methodName } from '../election'
import type { CounterexampleResponse, CriterionId, CriterionInfo, MethodId, MethodInfo } from '../types'
import CounterexampleView from './CounterexampleView.vue'

// Every method against every criterion. A ✗ is a button: the API searches random
// elections for a concrete counterexample and shows it.
const methods = shallowRef<MethodInfo[]>([])
const criteria = shallowRef<CriterionInfo[]>([])
const error = ref<string | null>(null)
const open = ref<{ method: MethodId; criterion: CriterionId } | null>(null)
const result = shallowRef<CounterexampleResponse | null>(null)
const loading = ref(false)

const SHORT: Record<CriterionId, string> = {
  majority: 'Majority',
  condorcet_winner: 'Condorcet winner',
  condorcet_loser: 'Condorcet loser',
  pareto: 'Unanimity',
  monotonicity: 'Monotonic',
  participation: 'Participation',
  iia: 'No spoilers (IIA)',
  clones: 'Clone-proof',
}

onMounted(async () => {
  try {
    ;[methods.value, criteria.value] = await Promise.all([api.methods(), api.criteria()])
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

async function show(method: MethodId, criterion: CriterionId) {
  open.value = { method, criterion }
  result.value = null
  loading.value = true
  try {
    result.value = await api.counterexample(method, criterion)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

const criterionName = (id: CriterionId) => criteria.value.find((c) => c.id === id)?.name ?? id
</script>

<template>
  <div>
    <p v-if="error" class="notice">{{ error }}</p>
    <div class="wrap">
      <table v-if="methods.length">
        <thead>
          <tr>
            <th scope="col">Method</th>
            <th v-for="c in criteria" :key="c.id" scope="col" :title="c.question">{{ SHORT[c.id] }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in methods" :key="m.id">
            <th scope="row">{{ m.name }}</th>
            <td v-for="v in m.criteria" :key="v.criterion">
              <span v-if="v.satisfied" class="yes" :title="`${m.name} always satisfies ${criterionName(v.criterion)}`">✓</span>
              <button
                v-else
                class="no"
                :class="{ active: open?.method === m.id && open?.criterion === v.criterion }"
                :title="`Show an election where ${m.name} breaks ${criterionName(v.criterion)}`"
                :aria-label="`${m.name} fails ${criterionName(v.criterion)}: show an example`"
                @click="show(m.id, v.criterion)"
              >
                ✗
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="small muted">✓ always satisfied · ✗ can fail: tap it and the server will search for a concrete election.</p>
    <div v-if="open" class="card panel" aria-live="polite">
      <div class="eyebrow">{{ methodName(open.method) }} vs {{ criterionName(open.criterion) }}</div>
      <p class="small">{{ criteria.find((c) => c.id === open!.criterion)?.description }}</p>
      <p v-if="loading" class="small">Searching random elections…</p>
      <CounterexampleView v-else-if="result?.counterexample" :example="result.counterexample" />
      <p v-else-if="result" class="small">The search came back empty this time.</p>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  overflow-x: auto;
}

table {
  font-size: 0.85rem;
  min-width: 44rem;
}

th,
td {
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--grid);
  text-align: center;
}

thead th {
  font-size: 0.75rem;
  color: var(--ink-2);
  vertical-align: bottom;
}

th[scope='row'] {
  text-align: left;
  white-space: nowrap;
}

.yes {
  color: var(--good);
  font-weight: 800;
}

.no {
  border: none;
  background: var(--bad-bg);
  color: var(--bad);
  font-weight: 800;
  border-radius: 6px;
  width: 1.9rem;
  height: 1.7rem;
}

.no:hover,
.no.active {
  outline: 2px solid var(--bad);
}

.panel {
  margin-top: 1rem;
}
</style>
