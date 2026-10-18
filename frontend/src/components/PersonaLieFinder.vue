<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import { CANDIDATES, electionOf, PERSONAS, type CastBallot } from '../cast'
import { BALLOT_KIND, methodName, tacticName } from '../election'
import { listOf } from '../i18n'
import type { BallotInput, Manipulation, MethodId } from '../types'
import Chip from './Chip.vue'
import RichText from './RichText'

// Asks the server for every profitable lie in Riverton under one method, and
// tells it in terms of the town's spokespeople.
const props = withDefaults(defineProps<{ method: MethodId; ballots: CastBallot[]; applicable?: boolean }>(), { applicable: true })
const emit = defineEmits<{ apply: [number, CastBallot] }>()

const results = ref<Manipulation[] | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const election = computed(() => electionOf(props.ballots).election)
const names = CANDIDATES.map((c) => c.name)
const { t } = useI18n()

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

// The part of a ballot this method reads, as the reader would fill it in.
function ballotText(b: BallotInput): string {
  switch (kind.value) {
    case 'choose_one':
      return names[b.ranking[0]]
    case 'veto':
      return names[b.ranking[b.ranking.length - 1]]
    case 'approval': {
      const approved = b.ranking.filter((c) => b.approvals?.[c]).map((c) => names[c])
      return approved.length ? listOf(approved) : t('lieFinder.nobodyApproved')
    }
    case 'score':
      return b.ranking.map((c) => `${names[c]} ${b.scores?.[c] ?? '?'}`).join(' · ')
    default:
      return b.ranking.map((c) => names[c]).join(' > ')
  }
}

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
      {{ loading ? t('lieFinder.searching') : t('lieFinder.ask', { method: methodName(method) }) }}
    </button>
    <p v-if="error" class="notice">{{ error }}</p>
    <p v-else-if="results && results.length === 0" class="small">{{ t('lieFinder.nobody') }}</p>
    <ul v-else-if="results" class="list">
      <li v-for="(m, i) in results" :key="i" class="item">
        <div class="row">
          <strong>
            {{
              m.voters === groupSize(m.group)
                ? t('lieFinder.group', { name: PERSONAS[m.group].name })
                : t('lieFinder.part', { n: m.voters, name: PERSONAS[m.group].name, total: groupSize(m.group) })
            }}
          </strong>
          <span class="pill">{{ tacticName(m.tactic) }}</span>
          <span class="small">
            <Chip :index="m.honest_winner" :name="names[m.honest_winner]" /> →
            <Chip :index="m.new_winner" :name="names[m.new_winner]" strong />
          </span>
        </div>
        <RichText
          tag="p"
          class="small"
          :text="t(`lieFinder.instead.${kind}`, { lie: ballotText(m.strategic), honest: ballotText(m.sincere) })"
        />
        <button v-if="applicable && m.voters === groupSize(m.group)" class="btn small" @click="apply(m)">
          {{ t('lieFinder.apply', { name: PERSONAS[m.group].name }) }}
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
