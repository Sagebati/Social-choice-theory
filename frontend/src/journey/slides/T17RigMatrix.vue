<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../../api'
import Challenge from '../../components/Challenge.vue'
import Chip from '../../components/Chip.vue'
import Takeaway from '../../components/Takeaway.vue'
import { electionOf, honestBallots, NAMES, PERSONAS } from '../../cast'
import { useLive } from '../../composables/useLive'
import { METHOD_NAMES, TACTIC_NAMES } from '../../election'
import type { Manipulation, MethodId } from '../../types'
import TownFrame from '../TownFrame.vue'

const METHODS: MethodId[] = ['plurality', 'two_round', 'irv', 'borda', 'schulze', 'approval', 'star', 'dictatorship']
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
const safe = computed(() => (grid.value ? METHODS.filter((_, k) => grid.value![k].every((x) => x === null)).map((m) => METHOD_NAMES[m]) : []))
const tip = (m: Manipulation) =>
  `${m.voters} of ${PERSONAS[m.group].name}'s ${PERSONAS[m.group].voters} voters, by ${TACTIC_NAMES[m.tactic].toLowerCase()}, get ${NAMES[m.new_winner]} instead of ${NAMES[m.honest_winner]}.`
</script>

<template>
  <TownFrame title="Everyone can be gamed">
    <template #story>
      <p>
        Arrow's theorem is about fairness. Its twin is about honesty. In 1973 and 1975 Allan Gibbard and Mark
        Satterthwaite proved that with three or more candidates, <strong>every</strong> voting system that is not a
        dictatorship (and can elect anyone) will, in some election, reward someone for lying.
      </p>
      <p>
        Let's check Riverton. The server will try every possible insincere ballot, for every group and every number
        of liars inside it, under each system.
      </p>
      <button class="btn primary" :disabled="loading || !!data" @click="run = true">
        {{ loading ? 'Trying every lie…' : data ? 'Done' : 'Search for every profitable lie' }}
      </button>
      <p v-if="error" class="notice">{{ error }}</p>
      <template v-if="grid">
        <Challenge id="t17" :done="true">
          Read the grid: a name in a cell means that group could get that mayor, whom they prefer, by lying.
          <template #success>
            {{ riggable }} of the {{ METHODS.length }} systems can be rigged by someone in Riverton. The exceptions here:
            {{ safe.join(' and ') }}. Under dictatorship only the dictator's ballot counts (here, Frank's group's), so
            nobody else's lies matter.
          </template>
        </Challenge>
        <Takeaway after="t17">
          <p>
            Gibbard's version of the theorem covers every kind of ballot, ticks and stars included: approval is safe in
            Riverton, not in every town. There is no perfect voting system, only trade-offs between flaws, and it pays
            to know which flaws you are choosing. The <RouterLink to="/lab">theorem lab</RouterLink> measures how often
            each system can be gamed across thousands of random towns.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <table v-if="grid" class="grid">
          <thead>
            <tr>
              <th scope="col">System</th>
              <th v-for="p in PERSONAS" :key="p.name" scope="col">{{ p.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, k) in grid" :key="METHODS[k]">
              <th scope="row">{{ METHOD_NAMES[METHODS[k]] }}</th>
              <td v-for="(cell, g) in row" :key="g" :title="cell ? tip(cell) : 'No profitable lie'">
                <Chip v-if="cell" :index="cell.new_winner" :name="NAMES[cell.new_winner]" />
                <span v-else class="muted">·</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted small">Run the search to fill the grid.</p>
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
