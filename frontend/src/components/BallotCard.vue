<script setup lang="ts">
import { color } from '../palette'
import type { Ballot, BallotKind } from '../types'

// A single voter's ballot, drawn the way that kind of ballot looks on paper.
defineProps<{ ballot: Ballot; names: string[]; kind: BallotKind; maxScore?: number; title?: string }>()
</script>

<template>
  <div class="ballot" :aria-label="title ?? 'Your ballot'">
    <div class="eyebrow">{{ title ?? 'Your ballot' }}</div>
    <ul v-if="kind === 'choose_one'">
      <li v-for="(name, c) in names" :key="c" :class="{ on: ballot.ranking[0] === c }">
        <span class="mark" aria-hidden="true">{{ ballot.ranking[0] === c ? '✗' : '' }}</span>
        <span class="sw" :style="{ background: color(c) }" />{{ name }}
      </li>
    </ul>
    <ol v-else-if="kind === 'ranked' || kind === 'veto'">
      <li v-for="(c, pos) in ballot.ranking" :key="c" class="on">
        <span class="mark num">{{ pos + 1 }}</span>
        <span class="sw" :style="{ background: color(c) }" />{{ names[c] }}
      </li>
    </ol>
    <ul v-else-if="kind === 'approval'">
      <li v-for="(name, c) in names" :key="c" :class="{ on: ballot.approvals[c] }">
        <span class="mark" aria-hidden="true">{{ ballot.approvals[c] ? '✓' : '' }}</span>
        <span class="sw" :style="{ background: color(c) }" />{{ name }}
        <span class="visually-hidden">{{ ballot.approvals[c] ? 'approved' : 'not approved' }}</span>
      </li>
    </ul>
    <ul v-else>
      <li v-for="(name, c) in names" :key="c" class="on">
        <span class="sw" :style="{ background: color(c) }" />
        <span class="nm">{{ name }}</span>
        <span class="stars" :aria-label="`${ballot.scores[c]} out of ${maxScore ?? 5}`">
          <span v-for="k in maxScore ?? 5" :key="k" :class="{ lit: k <= ballot.scores[c] }">★</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ballot {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  font-size: 0.92rem;
  min-width: 11rem;
}

ul,
ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--muted);
}

li.on {
  color: var(--ink);
  font-weight: 600;
}

.mark {
  width: 1.2rem;
  height: 1.2rem;
  border: 1.5px solid var(--axis);
  border-radius: 4px;
  display: grid;
  place-items: center;
  font-size: 0.8rem;
  font-weight: 800;
  flex: none;
}

.num {
  border-radius: 50%;
  border-color: var(--ink-2);
}

.sw {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.nm {
  min-width: 2.5rem;
}

.stars span {
  color: var(--grid);
  font-size: 1rem;
}

.stars span.lit {
  color: var(--ink);
}
</style>
