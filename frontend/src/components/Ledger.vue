<script setup lang="ts">
import { computed } from 'vue'
import { honestBallots, NAMES } from '../cast'
import { useTown } from '../composables/useTown'
import { color } from '../palette'
import type { MethodId } from '../types'

// The scoreboard that fills up along the journey: the same voters, one more
// voting system, (usually) one more mayor.
const SYSTEMS: { method: MethodId; label: string }[] = [
  { method: 'plurality', label: 'One mark' },
  { method: 'two_round', label: 'Two rounds' },
  { method: 'irv', label: 'Instant runoff' },
  { method: 'borda', label: 'Borda points' },
  { method: 'schulze', label: 'Head to head' },
  { method: 'approval', label: 'Approval' },
  { method: 'star', label: 'STAR' },
]

const props = defineProps<{ seen: MethodId[]; current?: MethodId | null }>()
const { results } = useTown(honestBallots, () => ({}), SYSTEMS.map((s) => s.method))
const rows = computed(() =>
  SYSTEMS.map((s) => ({
    ...s,
    seen: props.seen.includes(s.method),
    winner: results.value?.byMethod[s.method]?.winner ?? null,
  })),
)
</script>

<template>
  <nav class="ledger" aria-label="Who wins under each system so far">
    <span class="eyebrow">Same voters, mayor by system</span>
    <ol>
      <li v-for="r in rows" :key="r.method" :class="{ seen: r.seen, current: current === r.method }">
        <span class="system">{{ r.label }}</span>
        <span v-if="r.seen && r.winner !== null" class="who">
          <span class="dot" :style="{ background: color(r.winner) }" />{{ NAMES[r.winner] }}
        </span>
        <span v-else class="who unknown">?</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.ledger {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.55rem 0.75rem;
  border-radius: 12px;
  background: var(--surface-2);
}

.ledger .eyebrow {
  margin: 0;
}

ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

li {
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  min-width: 6.5rem;
  opacity: 0.55;
}

li.seen {
  opacity: 1;
}

li.current {
  outline: 2px solid var(--ink);
}

.system {
  font-size: 0.7rem;
  color: var(--ink-2);
  font-weight: 600;
}

.who {
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.92rem;
}

.unknown {
  color: var(--muted);
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
</style>
