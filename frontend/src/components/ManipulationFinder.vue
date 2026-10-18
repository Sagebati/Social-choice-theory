<script setup lang="ts">
import { ref, watch } from 'vue'
import { api } from '../api'
import { BALLOT_KIND, METHOD_NAMES, TACTIC_NAMES } from '../election'
import type { Election, ElectionInput, Manipulation, MethodId } from '../types'
import Chip from './Chip.vue'

// Asks the API whether any bloc of voters can get a result they prefer by
// lying, and lets the reader apply the lie.
const props = withDefaults(defineProps<{ election: ElectionInput; method: MethodId; applicable?: boolean }>(), {
  applicable: true,
})
const emit = defineEmits<{ apply: [Election, Manipulation] }>()

const results = ref<Manipulation[] | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

// A different election makes old answers meaningless.
watch(
  () => JSON.stringify([props.election, props.method]),
  () => {
    results.value = null
    error.value = null
  },
)

async function search() {
  loading.value = true
  error.value = null
  try {
    results.value = (await api.manipulate(props.election, props.method, 6)).manipulations
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="finder">
    <div class="row">
      <button class="btn primary" :disabled="loading" @click="search">
        {{ loading ? 'Searching every possible lie…' : `Find a profitable lie (${METHOD_NAMES[method]})` }}
      </button>
    </div>
    <p v-if="error" class="notice">{{ error }}</p>
    <p v-else-if="results && results.length === 0" class="small">
      No bloc of voters can get a better result by lying here. Not every election is manipulable, but the
      Gibbard–Satterthwaite theorem says some always are.
    </p>
    <ul v-else-if="results" class="list">
      <li v-for="(m, i) in results" :key="i" class="item">
        <div class="row">
          <span class="pill">{{ TACTIC_NAMES[m.tactic] }}</span>
          <span class="small">
            <Chip :index="m.honest_winner" :name="election.candidates[m.honest_winner]" /> →
            <Chip :index="m.new_winner" :name="election.candidates[m.new_winner]" strong />
          </span>
          <span class="small muted">{{ m.voters }} liar{{ m.voters === 1 ? '' : 's' }}</span>
        </div>
        <p class="small">{{ m.explanation }}</p>
        <button v-if="applicable" class="btn small" @click="emit('apply', m.election, m)">
          Apply this lie
        </button>
      </li>
    </ul>
    <p v-if="results && BALLOT_KIND[method] !== 'ranked' && results.length" class="small muted">
      Only the part of the ballot this method reads is changed.
    </p>
  </div>
</template>

<style scoped>
.list {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.item {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
}

.item p {
  margin: 0.35rem 0;
}
</style>
