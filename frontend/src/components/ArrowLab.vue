<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '../api'
import { useLive } from '../composables/useLive'
import { methodName } from '../election'
import type { ArrowProfile, RuleId } from '../types'
import ArrowProfileView from './ArrowProfile.vue'

// Arrow's four wishes, checked against every possible election of a few voters.
const props = withDefaults(defineProps<{ rules?: RuleId[] }>(), {
  rules: () => ['plurality', 'irv', 'borda', 'schulze', 'approval', 'agenda', 'pairwise_majority', 'dictatorship'],
})
const emit = defineEmits<{ checked: [RuleId, number] }>()

const rule = ref<RuleId>(props.rules[0])
const voters = ref(3)
const { data: report, loading, error } = useLive(() => ({ rule: rule.value, voters: voters.value }), (q) => api.arrow(q.rule, q.voters))

const ruleName = (r: RuleId) => (r === 'pairwise_majority' ? 'Pairwise majority' : methodName(r))

const conditions = computed(() => {
  const r = report.value
  if (!r) return []
  return [
    { key: 'transitivity', title: 'Always a ranking', wish: 'Whatever the ballots, society gets a consistent ranking (no A > B > C > A).', ok: r.transitivity === null },
    { key: 'pareto', title: 'Unanimity', wish: 'If every voter prefers X to Y, society does too.', ok: r.pareto === null },
    { key: 'iia', title: 'Independence', wish: 'How society ranks X against Y depends only on how voters rank X against Y.', ok: r.iia === null },
    { key: 'dictator', title: 'No dictator', wish: 'No single voter always gets their way.', ok: r.dictator === null },
  ]
})

const met = computed(() => conditions.value.filter((c) => c.ok).length)

watch(report, (r) => {
  if (r) emit('checked', r.rule, met.value)
})

function verdict(profile: ArrowProfile, a: number, b: number, names: string[]): string {
  if (!profile.social) return 'no verdict (cycle)'
  const tier = (c: number) => profile.social!.findIndex((t) => t.includes(c))
  const [ta, tb] = [tier(a), tier(b)]
  if (ta === tb) return `${names[a]} and ${names[b]} tied`
  return ta < tb ? `${names[a]} above ${names[b]}` : `${names[b]} above ${names[a]}`
}
</script>

<template>
  <div class="arrow-lab">
    <div class="controls">
      <div class="row" role="radiogroup" aria-label="Voting rule">
        <button
          v-for="r in rules"
          :key="r"
          class="btn small"
          :class="{ primary: rule === r }"
          role="radio"
          :aria-checked="rule === r"
          @click="rule = r"
        >
          {{ ruleName(r) }}
        </button>
      </div>
      <label class="row small">
        Voters
        <select v-model.number="voters">
          <option :value="2">2</option>
          <option :value="3">3</option>
          <option :value="4">4</option>
        </select>
        <span v-if="report" class="muted">checking all {{ report.profiles }} possible elections with 3 candidates</span>
      </label>
    </div>

    <p v-if="error" class="notice">{{ error }}</p>
    <div v-if="report" class="results" :class="{ stale: loading }">
      <p class="score">
        <strong>{{ ruleName(report.rule) }}</strong> grants <strong>{{ met }} of 4</strong> wishes.
      </p>
      <div class="cards">
        <div v-for="c in conditions" :key="c.key" class="cond" :class="c.ok ? 'ok' : 'fail'">
          <div class="cond-head">
            <span class="mark" aria-hidden="true">{{ c.ok ? '✓' : '✗' }}</span>
            <strong>{{ c.title }}</strong>
            <span class="visually-hidden">{{ c.ok ? 'satisfied' : 'violated' }}</span>
          </div>
          <p class="wish small">{{ c.wish }}</p>
        </div>
      </div>

      <div v-if="report.transitivity" class="example">
        <h4>Why it fails "always a ranking"</h4>
        <p class="small">
          Society finds {{ report.candidates[report.transitivity.cycle[0]] }} at least as good as
          {{ report.candidates[report.transitivity.cycle[1]] }}, and
          {{ report.candidates[report.transitivity.cycle[1]] }} at least as good as
          {{ report.candidates[report.transitivity.cycle[2]] }}, yet
          {{ report.candidates[report.transitivity.cycle[2]] }} beats
          {{ report.candidates[report.transitivity.cycle[0]] }}. The majority goes round in circles, so there is no
          ranking to report.
        </p>
        <ArrowProfileView :profile="report.transitivity.profile" :names="report.candidates" />
      </div>

      <div v-if="report.pareto" class="example">
        <h4>Why it fails unanimity</h4>
        <p class="small">
          Every voter ranks {{ report.candidates[report.pareto.better] }} above
          {{ report.candidates[report.pareto.worse] }}, but society has
          {{ verdict(report.pareto.profile, report.pareto.better, report.pareto.worse, report.candidates) }}.
        </p>
        <ArrowProfileView :profile="report.pareto.profile" :names="report.candidates" />
      </div>

      <div v-if="report.iia" class="example">
        <h4>Why it fails independence</h4>
        <p class="small">
          In both elections, each voter ranks {{ report.candidates[report.iia.a] }} against
          {{ report.candidates[report.iia.b] }} exactly the same way. Only
          {{ report.iia.changed_voters.map((v) => `voter ${v + 1}`).join(' and ') }} changed, and only about where
          the third candidate goes. Yet society flips from
          <strong>{{ verdict(report.iia.first, report.iia.a, report.iia.b, report.candidates) }}</strong> to
          <strong>{{ verdict(report.iia.second, report.iia.a, report.iia.b, report.candidates) }}</strong>.
        </p>
        <div class="pair">
          <ArrowProfileView
            :profile="report.iia.first"
            :names="report.candidates"
            :changed="report.iia.changed_voters"
            caption="Election 1"
          />
          <ArrowProfileView
            :profile="report.iia.second"
            :names="report.candidates"
            :changed="report.iia.changed_voters"
            caption="Election 2"
          />
        </div>
      </div>

      <div v-if="report.dictator !== null" class="example">
        <h4>Why it fails "no dictator"</h4>
        <p class="small">
          In every one of the {{ report.profiles }} elections, society copies voter {{ report.dictator + 1 }}'s
          preferences exactly. Everyone else might as well stay home.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 0.9rem;
}

.stale {
  opacity: 0.55;
  transition: opacity 0.2s;
}

.score {
  font-size: 1.05rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.5rem;
}

.cond {
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border);
}

.cond.ok {
  background: var(--good-bg);
}

.cond.fail {
  background: var(--bad-bg);
}

.cond-head {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.mark {
  font-weight: 800;
}

.ok .mark {
  color: var(--good);
}

.fail .mark {
  color: var(--bad);
}

.wish {
  margin: 0.3rem 0 0;
  color: var(--ink-2);
}

.example {
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--grid);
  overflow-x: auto;
}

.example h4 {
  margin-bottom: 0.3rem;
}

.pair {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
}
</style>
