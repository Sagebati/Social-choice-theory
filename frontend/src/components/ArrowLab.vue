<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import { useLive } from '../composables/useLive'
import { methodName } from '../election'
import { listOf } from '../i18n'
import type { ArrowProfile, RuleId } from '../types'
import ArrowProfileView from './ArrowProfile.vue'
import RichText from './RichText'

// Arrow's four wishes, checked against every possible election of a few voters.
const props = withDefaults(defineProps<{ rules?: RuleId[] }>(), {
  rules: () => ['plurality', 'irv', 'borda', 'schulze', 'approval', 'agenda', 'pairwise_majority', 'dictatorship'],
})
const emit = defineEmits<{ checked: [RuleId, number] }>()
const { t } = useI18n()

const rule = ref<RuleId>(props.rules[0])
const voters = ref(3)
const { data: report, loading, error } = useLive(() => ({ rule: rule.value, voters: voters.value }), (q) => api.arrow(q.rule, q.voters))

const ruleName = (r: RuleId) => (r === 'pairwise_majority' ? t('arrowLab.pairwiseMajority') : methodName(r))

const conditions = computed(() => {
  const r = report.value
  if (!r) return []
  return (
    [
      ['transitivity', r.transitivity === null],
      ['pareto', r.pareto === null],
      ['iia', r.iia === null],
      ['dictator', r.dictator === null],
    ] as const
  ).map(([key, ok]) => ({
    key,
    title: t(`arrowLab.conditions.${key}.title`),
    wish: t(`arrowLab.conditions.${key}.wish`),
    ok,
  }))
})

const met = computed(() => conditions.value.filter((c) => c.ok).length)

watch(report, (r) => {
  if (r) emit('checked', r.rule, met.value)
})

function verdict(profile: ArrowProfile, a: number, b: number, names: string[]): string {
  if (!profile.social) return t('arrowLab.verdict.cycle')
  const tier = (c: number) => profile.social!.findIndex((group) => group.includes(c))
  const [ta, tb] = [tier(a), tier(b)]
  if (ta === tb) return t('arrowLab.verdict.tied', { a: names[a], b: names[b] })
  return ta < tb
    ? t('arrowLab.verdict.above', { a: names[a], b: names[b] })
    : t('arrowLab.verdict.above', { a: names[b], b: names[a] })
}
</script>

<template>
  <div class="arrow-lab">
    <div class="controls">
      <div class="row" role="radiogroup" :aria-label="t('arrowLab.ruleAria')">
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
        {{ t('arrowLab.voters') }}
        <select v-model.number="voters">
          <option :value="2">2</option>
          <option :value="3">3</option>
          <option :value="4">4</option>
        </select>
        <span v-if="report" class="muted">{{ t('arrowLab.checking', { n: report.profiles }) }}</span>
      </label>
    </div>

    <p v-if="error" class="notice">{{ error }}</p>
    <div v-if="report" class="results" :class="{ stale: loading }">
      <RichText tag="p" class="score" :text="t('arrowLab.score', { rule: ruleName(report.rule), met })" />
      <div class="cards">
        <div v-for="c in conditions" :key="c.key" class="cond" :class="c.ok ? 'ok' : 'fail'">
          <div class="cond-head">
            <span class="mark" aria-hidden="true">{{ c.ok ? '✓' : '✗' }}</span>
            <strong>{{ c.title }}</strong>
            <span class="visually-hidden">{{ c.ok ? t('arrowLab.satisfied') : t('arrowLab.violated') }}</span>
          </div>
          <p class="wish small">{{ c.wish }}</p>
        </div>
      </div>

      <div v-if="report.transitivity" class="example">
        <h4>{{ t('arrowLab.transitivity.title') }}</h4>
        <p class="small">
          {{
            t('arrowLab.transitivity.text', {
              a: report.candidates[report.transitivity.cycle[0]],
              b: report.candidates[report.transitivity.cycle[1]],
              c: report.candidates[report.transitivity.cycle[2]],
            })
          }}
        </p>
        <ArrowProfileView :profile="report.transitivity.profile" :names="report.candidates" />
      </div>

      <div v-if="report.pareto" class="example">
        <h4>{{ t('arrowLab.pareto.title') }}</h4>
        <p class="small">
          {{
            t('arrowLab.pareto.text', {
              better: report.candidates[report.pareto.better],
              worse: report.candidates[report.pareto.worse],
              verdict: verdict(report.pareto.profile, report.pareto.better, report.pareto.worse, report.candidates),
            })
          }}
        </p>
        <ArrowProfileView :profile="report.pareto.profile" :names="report.candidates" />
      </div>

      <div v-if="report.iia" class="example">
        <h4>{{ t('arrowLab.iia.title') }}</h4>
        <RichText
          tag="p"
          class="small"
          :text="
            t('arrowLab.iia.text', {
              a: report.candidates[report.iia.a],
              b: report.candidates[report.iia.b],
              voters: listOf(report.iia.changed_voters.map((v) => t('arrowLab.iia.voter', { n: v + 1 }))),
              first: verdict(report.iia.first, report.iia.a, report.iia.b, report.candidates),
              second: verdict(report.iia.second, report.iia.a, report.iia.b, report.candidates),
            })
          "
        />
        <div class="pair">
          <ArrowProfileView
            :profile="report.iia.first"
            :names="report.candidates"
            :changed="report.iia.changed_voters"
            :caption="t('arrowLab.iia.election1')"
          />
          <ArrowProfileView
            :profile="report.iia.second"
            :names="report.candidates"
            :changed="report.iia.changed_voters"
            :caption="t('arrowLab.iia.election2')"
          />
        </div>
      </div>

      <div v-if="report.dictator !== null" class="example">
        <h4>{{ t('arrowLab.dictator.title') }}</h4>
        <p class="small">{{ t('arrowLab.dictator.text', { n: report.profiles, voter: report.dictator + 1 }) }}</p>
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
