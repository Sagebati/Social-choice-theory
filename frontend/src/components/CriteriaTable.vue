<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import { methodName } from '../election'
import { locale } from '../i18n'
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
const { t } = useI18n()
const short = (id: CriterionId) => t(`criteriaTable.short.${id}`)

// Names, questions and explanations come from the API in the reader's language:
// fetch them again (and any counterexample on show) when it changes.
watch(
  locale,
  async () => {
    try {
      ;[methods.value, criteria.value] = await Promise.all([api.methods(), api.criteria()])
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
    if (open.value) void show(open.value.method, open.value.criterion)
  },
  { immediate: true },
)

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
            <th scope="col">{{ t('criteriaTable.method') }}</th>
            <th v-for="c in criteria" :key="c.id" scope="col" :title="c.question">{{ short(c.id) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in methods" :key="m.id">
            <th scope="row">{{ m.name }}</th>
            <td v-for="v in m.criteria" :key="v.criterion">
              <span
                v-if="v.satisfied"
                class="yes"
                :title="t('criteriaTable.always', { method: m.name, criterion: criterionName(v.criterion) })"
              >
                ✓
              </span>
              <button
                v-else
                class="no"
                :class="{ active: open?.method === m.id && open?.criterion === v.criterion }"
                :title="t('criteriaTable.show', { method: m.name, criterion: criterionName(v.criterion) })"
                :aria-label="t('criteriaTable.failsAria', { method: m.name, criterion: criterionName(v.criterion) })"
                @click="show(m.id, v.criterion)"
              >
                ✗
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="small muted">{{ t('criteriaTable.legend') }}</p>
    <div v-if="open" class="card panel" aria-live="polite">
      <div class="eyebrow">
        {{ t('criteriaTable.versus', { method: methodName(open.method), criterion: criterionName(open.criterion) }) }}
      </div>
      <p class="small">{{ criteria.find((c) => c.id === open!.criterion)?.description }}</p>
      <p v-if="loading" class="small">{{ t('criteriaTable.searching') }}</p>
      <CounterexampleView v-else-if="result?.counterexample" :example="result.counterexample" />
      <p v-else-if="result" class="small">{{ t('criteriaTable.empty') }}</p>
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
