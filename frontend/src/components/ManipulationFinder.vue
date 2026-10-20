<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import { BALLOT_KIND, methodName, tacticName } from '../election'
import { locale } from '../i18n'
import type { Election, ElectionInput, Manipulation, MethodId } from '../types'
import Announce from './Announce.vue'
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
const { t } = useI18n()
// Each search takes a ticket; only the latest may write its answer, so a slow
// reply about an election the reader has since changed can't land on the new one.
let ticket = 0

// A different election makes old answers meaningless.
watch(
  () => JSON.stringify([props.election, props.method]),
  () => {
    ticket++
    results.value = null
    error.value = null
    loading.value = false
  },
)

// The explanations are written in the reader's language: ask again in the new one.
watch(locale, () => {
  if (results.value || loading.value) void search(true)
})

async function search(again = false) {
  if (loading.value && !again) return
  const mine = ++ticket
  loading.value = true
  error.value = null
  try {
    const found = (await api.manipulate(props.election, props.method, 6)).manipulations
    if (mine === ticket) results.value = found
  } catch (e) {
    if (mine === ticket) error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (mine === ticket) loading.value = false
  }
}

const news = computed(() => {
  if (loading.value) return t('manipulationFinder.searching')
  if (!results.value) return ''
  return results.value.length ? t('manipulationFinder.found', results.value.length) : t('manipulationFinder.none')
})
</script>

<template>
  <div class="finder">
    <div class="row">
      <!-- aria-disabled, not disabled: the button keeps focus while the search runs. -->
      <button class="btn primary" :aria-disabled="loading" @click="search()">
        {{ loading ? t('manipulationFinder.searching') : t('manipulationFinder.find', { method: methodName(method) }) }}
      </button>
    </div>
    <Announce :text="news" :delay="100" />
    <p v-if="error" class="notice" role="alert">{{ error }}</p>
    <p v-else-if="results && results.length === 0" class="small">{{ t('manipulationFinder.none') }}</p>
    <ul v-else-if="results" class="list">
      <li v-for="(m, i) in results" :key="i" class="item">
        <div class="row">
          <span class="pill">{{ tacticName(m.tactic) }}</span>
          <span class="small">
            <Chip :index="m.honest_winner" :name="election.candidates[m.honest_winner]" /> →
            <Chip :index="m.new_winner" :name="election.candidates[m.new_winner]" strong />
          </span>
          <span class="small muted">{{ t('manipulationFinder.liars', m.voters) }}</span>
        </div>
        <p class="small">{{ m.explanation }}</p>
        <button v-if="applicable" class="btn small" @click="emit('apply', m.election, m)">
          {{ t('manipulationFinder.apply') }}
        </button>
      </li>
    </ul>
    <p v-if="results && BALLOT_KIND[method] !== 'ranked' && results.length" class="small muted">
      {{ t('manipulationFinder.partOnly') }}
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
