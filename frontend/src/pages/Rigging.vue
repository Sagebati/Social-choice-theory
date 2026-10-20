<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { api } from '../api'
import RichText from '../components/RichText'
import ScenarioLab from '../components/ScenarioLab.vue'
import { locale } from '../i18n'
import type { CriterionId, CriterionInfo, Family, MethodInfo, Scenario } from '../types'

const { t } = useI18n()

const methods = shallowRef<MethodInfo[]>([])
const criteria = shallowRef<CriterionInfo[]>([])
const scenarios = shallowRef<Scenario[]>([])
const error = ref<string | null>(null)
const open = ref<Scenario | null>(null)
const labEl = ref<HTMLElement | null>(null)

// The catalogue is written by the API, in the reader's language: fetch it again
// when the language changes, keeping the open scenario open.
watch(
  locale,
  async () => {
    try {
      ;[methods.value, criteria.value, scenarios.value] = await Promise.all([api.methods(), api.criteria(), api.scenarios()])
      error.value = null
      if (open.value) open.value = scenarios.value.find((s) => s.id === open.value!.id) ?? null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  },
  { immediate: true },
)

const FAMILIES: Family[] = ['positional', 'runoff', 'condorcet', 'cardinal', 'degenerate']
const byFamily = computed(() =>
  FAMILIES.map((id) => ({
    id,
    title: t(`rigging.families.${id}.title`),
    blurb: t(`rigging.families.${id}.blurb`),
    methods: methods.value.filter((m) => m.family === id),
  })),
)
const criterionName = (id: CriterionId) => criteria.value.find((c) => c.id === id)?.name ?? id

const TACTICS = ['compromising', 'burying', 'pushOver', 'bullet', 'exaggeration', 'spoilers', 'agenda', 'abstention'] as const

async function tryScenario(id: string | null) {
  const s = scenarios.value.find((x) => x.id === id)
  if (!s) return
  open.value = s
  await nextTick()
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  labEl.value?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  labEl.value?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
}
</script>

<template>
  <div class="rigging">
    <header class="hero">
      <div class="eyebrow">{{ t('rigging.eyebrow') }}</div>
      <h1>{{ t('rigging.title') }}</h1>
      <RichText tag="p" class="lede" :text="t('rigging.lede')" />
    </header>

    <p v-if="error" class="notice">{{ t('common.apiError', { error }) }}</p>

    <section ref="labEl" class="scenario-lab">
      <div v-if="open" class="card">
        <div class="row head">
          <h2 tabindex="-1">{{ t('rigging.tryTitle', { title: open.title }) }}</h2>
          <button class="btn small" @click="open = null">{{ t('common.close') }}</button>
        </div>
        <ScenarioLab :scenario="open" />
      </div>
    </section>

    <section class="concepts">
      <div class="card">
        <h3>{{ t('rigging.condorcet.title') }}</h3>
        <RichText tag="p" :text="t('rigging.condorcet.p1')" />
        <RichText tag="p" :text="t('rigging.condorcet.p2')" />
        <div class="row">
          <RouterLink class="btn small" to="/learn/12">{{ t('rigging.condorcet.play1') }}</RouterLink>
        </div>
      </div>
      <div class="card">
        <h3>{{ t('rigging.arrow.title') }}</h3>
        <RichText tag="p" :text="t('rigging.arrow.p')" />
        <div class="row">
          <RouterLink class="btn small" to="/lab">{{ t('rigging.arrow.lab') }}</RouterLink>
        </div>
      </div>
      <div class="card">
        <h3>{{ t('rigging.gibbard.title') }}</h3>
        <p>{{ t('rigging.gibbard.p') }}</p>
        <div class="row">
          <RouterLink class="btn small" to="/learn/6">{{ t('rigging.gibbard.play') }}</RouterLink>
        </div>
      </div>
    </section>

    <section>
      <h2>{{ t('rigging.tacticsTitle') }}</h2>
      <dl class="tactics">
        <div v-for="id in TACTICS" :key="id" class="tactic">
          <dt>{{ t(`rigging.tactics.${id}.name`) }}</dt>
          <dd>{{ t(`rigging.tactics.${id}.text`) }}</dd>
        </div>
      </dl>
    </section>

    <section v-for="family in byFamily" :key="family.id" class="family">
      <h2>{{ family.title }}</h2>
      <p class="muted">{{ family.blurb }}</p>
      <div class="methods">
        <article v-for="m in family.methods" :id="m.id" :key="m.id" class="card method">
          <h3>{{ m.name }}</h3>
          <p class="summary">{{ m.summary }}</p>
          <p class="small">{{ m.how_it_works }}</p>
          <p class="small muted"><strong>{{ t('rigging.usedIn') }}</strong> {{ m.used_in }}</p>
          <h4>{{ t('rigging.howToRig') }}</h4>
          <ul class="rigs">
            <li v-for="r in m.rigging" :key="r.title">
              <strong>{{ r.title }}.</strong> {{ r.how }}
              <button v-if="r.scenario" class="btn small try" @click="tryScenario(r.scenario)">{{ t('rigging.tryIt') }}</button>
            </li>
          </ul>
          <div class="badges" :aria-label="t('rigging.criteriaAria')">
            <span
              v-for="c in m.criteria"
              :key="c.criterion"
              class="pill"
              :class="c.satisfied ? 'good' : 'bad'"
              :title="criteria.find((x) => x.id === c.criterion)?.question"
            >
              {{ c.satisfied ? '✓' : '✗' }} {{ criterionName(c.criterion) }}
            </span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rigging {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.hero {
  max-width: 50rem;
}

.lede {
  font-size: 1.08rem;
}

.scenario-lab {
  scroll-margin-top: 5rem;
}

.scenario-lab:empty {
  display: none;
}

.head {
  justify-content: space-between;
}

.head h2 {
  margin: 0;
}

.concepts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
  gap: 1rem;
}

.concepts p {
  font-size: 0.95rem;
}

.tactics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
  gap: 0.75rem;
  margin: 0;
}

.tactic {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
}

.tactic dt {
  font-weight: 800;
}

.tactic dd {
  margin: 0.2rem 0 0;
  font-size: 0.92rem;
  color: var(--ink-2);
}

.methods {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(21rem, 100%), 1fr));
  gap: 1rem;
}

.method {
  scroll-margin-top: 5rem;
}

.summary {
  font-weight: 600;
}

.method h4 {
  margin: 0.8rem 0 0.4rem;
}

.rigs {
  padding-left: 1.1rem;
  margin: 0 0 0.8rem;
  font-size: 0.92rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.try {
  margin-left: 0.3rem;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

a.btn {
  text-decoration: none;
}
</style>
