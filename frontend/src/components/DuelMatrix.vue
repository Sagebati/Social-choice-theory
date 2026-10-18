<script setup lang="ts">
import type { Pairwise } from '../types'
import Chip from './Chip.vue'

// The pairwise matrix as a table: row candidate against column candidate.
defineProps<{ names: string[]; pairwise: Pairwise }>()
</script>

<template>
  <div class="wrap">
    <table>
      <caption class="small muted">Voters preferring the row candidate to the column candidate</caption>
      <thead>
        <tr>
          <th />
          <th v-for="(name, j) in names" :key="j" scope="col"><Chip :index="j" :name="name" /></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(name, i) in names" :key="i">
          <th scope="row"><Chip :index="i" :name="name" :strong="pairwise.condorcet_winner === i" /></th>
          <td
            v-for="(_, j) in names"
            :key="j"
            :class="{
              self: i === j,
              win: i !== j && pairwise.matrix[i][j] > pairwise.matrix[j][i],
              lose: i !== j && pairwise.matrix[i][j] < pairwise.matrix[j][i],
            }"
          >
            <template v-if="i !== j">
              {{ pairwise.matrix[i][j] }}
              <span class="verdict">{{
                pairwise.matrix[i][j] > pairwise.matrix[j][i] ? 'wins' : pairwise.matrix[i][j] < pairwise.matrix[j][i] ? 'loses' : 'tie'
              }}</span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wrap {
  overflow-x: auto;
}

table {
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}

caption {
  text-align: left;
  padding-bottom: 0.4rem;
}

th,
td {
  padding: 0.3rem 0.55rem;
  text-align: center;
  border-bottom: 1px solid var(--grid);
}

th[scope='row'] {
  text-align: left;
}

td.self {
  background: var(--surface-2);
}

td.win {
  background: var(--good-bg);
  font-weight: 700;
}

td.lose {
  color: var(--muted);
}

.verdict {
  display: block;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--ink-2);
}
</style>
