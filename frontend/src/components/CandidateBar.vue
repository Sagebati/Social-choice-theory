<script setup lang="ts">
import { computed } from 'vue'
import { CANDIDATES, CLONE } from '../cast'
import { color, initial, onColor } from '../palette'

// The candidates on the ballot. Optionally lets the reader withdraw one.
const props = withDefaults(
  defineProps<{
    winner?: number | null
    out?: number[]
    withdrawable?: boolean
    clone?: boolean
    pitch?: boolean
  }>(),
  { winner: null, out: () => [], withdrawable: false, clone: false, pitch: false },
)
const withdrawn = defineModel<number[]>('withdrawn', { default: () => [] })

const list = computed(() => {
  const base = CANDIDATES.map((c, i) => ({ ...c, i }))
  return props.clone ? [...base, { ...CLONE, i: 5 }] : base
})

function toggle(i: number) {
  withdrawn.value = withdrawn.value.includes(i) ? withdrawn.value.filter((x) => x !== i) : [...withdrawn.value, i]
}
</script>

<template>
  <ul class="candidates" aria-label="Candidates">
    <li
      v-for="c in list"
      :key="c.i"
      class="cand"
      :class="{ winner: winner === c.i, out: out.includes(c.i) || withdrawn.includes(c.i) }"
    >
      <span class="token" :style="{ background: color(c.i), color: onColor(c.i) }" aria-hidden="true">{{ initial(c.name) }}</span>
      <div class="text">
        <strong>{{ c.fullName }}<span v-if="winner === c.i" class="crown"> ★ mayor</span></strong>
        <span class="role">{{ c.role }}</span>
        <span v-if="pitch" class="pitch">{{ c.pitch }}</span>
      </div>
      <button v-if="withdrawable && c.i < 5" class="btn small" :aria-pressed="withdrawn.includes(c.i)" @click="toggle(c.i)">
        {{ withdrawn.includes(c.i) ? 'Re-enter' : 'Withdraw' }}
      </button>
    </li>
  </ul>
</template>

<style scoped>
.candidates {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
  gap: 0.5rem;
}

.cand {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.55rem 0.65rem;
  flex-wrap: wrap;
  transition: opacity 0.2s;
}

.cand.winner {
  border: 2px solid var(--ink);
}

.cand.out {
  opacity: 0.4;
}

.token {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  flex: none;
}

.text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  font-size: 0.88rem;
  line-height: 1.3;
}

.role {
  font-size: 0.75rem;
  color: var(--ink-2);
}

.pitch {
  font-size: 0.78rem;
  margin-top: 0.15rem;
}

.crown {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
