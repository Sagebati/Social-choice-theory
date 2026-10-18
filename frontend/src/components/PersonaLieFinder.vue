<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '../api'
import { CANDIDATES, electionOf, PERSONAS, type CastBallot } from '../cast'
import { describeBallot, METHOD_NAMES, TACTIC_NAMES, BALLOT_KIND } from '../election'
import type { Manipulation, MethodId } from '../types'
import Chip from './Chip.vue'

// Asks the server for every profitable lie in Riverton under one method, and
// tells it in terms of the town's spokespeople.
const props = withDefaults(defineProps<{ method: MethodId; ballots: CastBallot[]; applicable?: boolean }>(), { applicable: true })
const emit = defineEmits<{ apply: [number, CastBallot] }>()

const results = ref<Manipulation[] | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const election = computed(() => electionOf(props.ballots).election)
const names = CANDIDATES.map((c) => c.name)

watch(
  () => JSON.stringify([election.value, props.method]),
  () => {
    results.value = null
  },
)

async function search() {
  loading.value = true
  error.value = null
  try {
    results.value = (await api.manipulate(election.value, props.method, 12)).manipulations
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

const groupSize = (g: number) => props.ballots[g]?.voters ?? PERSONAS[g].voters
const kind = computed(() => BALLOT_KIND[props.method])

function apply(m: Manipulation) {
  const b = m.strategic
  emit('apply', m.group, {
    ranking: [...b.ranking],
    ...(kind.value === 'approval' ? { approvals: [...b.approvals] } : {}),
    ...(kind.value === 'score' ? { scores: [...b.scores] } : {}),
  })
}
</script>

<template>
  <div class="finder">
    <button class="btn primary" :disabled="loading" @click="search">
      {{ loading ? 'Trying every possible lie…' : `Ask the machine: who can rig ${METHOD_NAMES[method]}?` }}
    </button>
    <p v-if="error" class="notice">{{ error }}</p>
    <p v-else-if="results && results.length === 0" class="small">
      Nobody. No group, and no part of a group, can get a mayor it prefers by lying here.
    </p>
    <ul v-else-if="results" class="list">
      <li v-for="(m, i) in results" :key="i" class="item">
        <div class="row">
          <strong>{{ m.voters === groupSize(m.group) ? `${PERSONAS[m.group].name}'s group` : `${m.voters} of ${PERSONAS[m.group].name}'s ${groupSize(m.group)}` }}</strong>
          <span class="pill">{{ TACTIC_NAMES[m.tactic] }}</span>
          <span class="small">
            <Chip :index="m.honest_winner" :name="names[m.honest_winner]" /> →
            <Chip :index="m.new_winner" :name="names[m.new_winner]" strong />
          </span>
        </div>
        <p class="small">
          Vote <strong>{{ describeBallot(names, m.strategic, kind) }}</strong> instead of
          {{ describeBallot(names, m.sincere, kind) }}.
        </p>
        <button v-if="applicable && m.voters === groupSize(m.group)" class="btn small" @click="apply(m)">
          Make {{ PERSONAS[m.group].name }}'s group do it
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
}

.item p {
  margin: 0.3rem 0;
}
</style>
