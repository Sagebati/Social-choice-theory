<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../../api'
import Challenge from '../../components/Challenge.vue'
import Chip from '../../components/Chip.vue'
import RichText from '../../components/RichText'
import Takeaway from '../../components/Takeaway.vue'
import { electionOf, honestBallots, NAMES, PERSONAS } from '../../cast'
import { useLive } from '../../composables/useLive'
import { methodName, tacticName } from '../../election'
import { listOf, locale } from '../../i18n'
import type { Manipulation, MethodId } from '../../types'
import TownFrame from '../TownFrame.vue'

const METHODS: MethodId[] = ['plurality', 'two_round', 'irv', 'borda', 'schulze', 'approval', 'star', 'dictatorship']
const { t } = useI18n()
const run = ref(false)
const { election } = electionOf(honestBallots())
const { data, loading, error } = useLive(
  () => (run.value ? METHODS : null),
  (methods) => Promise.all(methods.map((m) => api.manipulate(election, m, 40))),
)

// For each method and group, the most effective lie (fewest liars).
const grid = computed(() =>
  data.value
    ? METHODS.map((_, k) => {
        const found = data.value![k].manipulations
        return PERSONAS.map((_, g) => found.filter((x) => x.group === g).sort((a, b) => a.voters - b.voters)[0] ?? null)
      })
    : null,
)
const riggable = computed(() => grid.value?.filter((row) => row.some((x) => x !== null)).length ?? 0)
const safe = computed(() => (grid.value ? METHODS.filter((_, k) => grid.value![k].every((x) => x === null)).map((m) => methodName(m)) : []))
const tip = (m: Manipulation) =>
  t(
    't17.tip',
    {
      n: m.voters,
      name: PERSONAS[m.group].name,
      total: PERSONAS[m.group].voters,
      tactic: tacticName(m.tactic).toLocaleLowerCase(locale.value),
      winner: NAMES[m.new_winner],
      honest: NAMES[m.honest_winner],
    },
    m.voters,
  )
</script>

<template>
  <TownFrame :title="t('journey.steps.gibbard')">
    <template #story>
      <RichText tag="p" :text="t('t17.intro')" />
      <p>{{ t('t17.check') }}</p>
      <button class="btn primary" :disabled="loading || !!data" @click="run = true">
        {{ loading ? t('t17.searching') : data ? t('t17.done') : t('t17.search') }}
      </button>
      <p v-if="error" class="notice">{{ error }}</p>
      <template v-if="grid">
        <Challenge id="t17" :done="true">
          {{ t('t17.challenge') }}
          <template #success>
            {{ t('t17.success', { riggable, total: METHODS.length, safe: listOf(safe) }) }}
          </template>
        </Challenge>
        <Takeaway after="t17">
          <RichText tag="p" :text="t('t17.lesson')" />
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <table v-if="grid" class="grid">
          <thead>
            <tr>
              <th scope="col">{{ t('t17.system') }}</th>
              <th v-for="p in PERSONAS" :key="p.name" scope="col">{{ p.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, k) in grid" :key="METHODS[k]">
              <th scope="row">{{ methodName(METHODS[k]) }}</th>
              <td v-for="(cell, g) in row" :key="g" :title="cell ? tip(cell) : t('t17.noLie')">
                <Chip v-if="cell" :index="cell.new_winner" :name="NAMES[cell.new_winner]" />
                <span v-else class="muted">·</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted small">{{ t('t17.waiting') }}</p>
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.grid {
  width: 100%;
  font-size: 0.85rem;
}

.grid th,
.grid td {
  padding: 0.35rem 0.4rem;
  border-bottom: 1px solid var(--grid);
  text-align: left;
}

.grid thead th {
  font-size: 0.75rem;
  color: var(--ink-2);
}
</style>
