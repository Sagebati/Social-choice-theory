<script setup lang="ts">
import { describeBallot } from '../election'
import type { BallotInput, BallotKind } from '../types'

// The ballots of an election as compact lines: "40 × Ada > Bea > Cal".
defineProps<{ names: string[]; ballots: BallotInput[]; kind: BallotKind; changed?: number[] }>()
</script>

<template>
  <ul class="ballots">
    <li v-for="(b, i) in ballots" :key="i" :class="{ changed: changed?.includes(i) }">
      <span class="w">{{ b.weight }} ×</span>
      <!-- Scores already list every candidate in order; other kinds show the full
           ranking (what criteria are judged on) plus the part the method reads. -->
      <template v-if="kind === 'score'">{{ describeBallot(names, b, kind) }}</template>
      <template v-else>
        {{ describeBallot(names, b, 'ranked') }}<span v-if="kind !== 'ranked'" class="view"> · {{ describeBallot(names, b, kind) }}</span>
      </template>
    </li>
  </ul>
</template>

<style scoped>
.ballots {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.w {
  display: inline-block;
  min-width: 2.8rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--ink-2);
}

.changed {
  font-weight: 700;
}

.view {
  color: var(--ink-2);
}
</style>
