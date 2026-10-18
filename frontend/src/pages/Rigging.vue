<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api'
import ScenarioLab from '../components/ScenarioLab.vue'
import type { CriterionId, CriterionInfo, Family, MethodInfo, Scenario } from '../types'

const methods = shallowRef<MethodInfo[]>([])
const criteria = shallowRef<CriterionInfo[]>([])
const scenarios = shallowRef<Scenario[]>([])
const error = ref<string | null>(null)
const open = ref<Scenario | null>(null)
const labEl = ref<HTMLElement | null>(null)

onMounted(async () => {
  try {
    ;[methods.value, criteria.value, scenarios.value] = await Promise.all([api.methods(), api.criteria(), api.scenarios()])
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

const FAMILIES: { id: Family; title: string; blurb: string }[] = [
  { id: 'positional', title: 'Positional methods', blurb: 'Points by position on the ballot.' },
  { id: 'runoff', title: 'Runoff methods', blurb: 'Count, eliminate, count again.' },
  { id: 'condorcet', title: 'Condorcet methods', blurb: 'Built on head-to-head contests.' },
  { id: 'cardinal', title: 'Rated methods', blurb: 'Voters grade candidates instead of ranking them.' },
  { id: 'degenerate', title: 'The control group', blurb: 'What Arrow’s theorem says you are left with.' },
]
const byFamily = computed(() => FAMILIES.map((f) => ({ ...f, methods: methods.value.filter((m) => m.family === f.id) })))
const criterionName = (id: CriterionId) => criteria.value.find((c) => c.id === id)?.name ?? id

const TACTICS = [
  ['Compromising', 'Vote for a lesser evil above your real favourite, so a worse candidate loses. The engine of two-party politics.'],
  ['Burying', 'Rank a strong rival below candidates you actually think are worse. Deadly under Borda and Coombs; the only way to attack a Condorcet method.'],
  ['Push-over', 'Boost a candidate you don’t want, so your favourite faces an easier opponent or a dangerous rival is eliminated early. Only works where the count isn’t monotonic, as in runoffs.'],
  ['Bullet voting', 'Support only your favourite, so your other preferences can’t help them lose. The classic approval and score voting worry.'],
  ['Exaggeration', 'Use only the top and bottom of a score scale. Rated methods reward it; STAR’s runoff limits it.'],
  ['Spoilers and clones', 'Change the menu instead of the ballots: sponsor a look-alike to split a rival’s vote (plurality), or run a team of clones to collect extra points (Borda).'],
  ['Agenda control', 'When the majority goes in circles, whoever sets the order of votes picks the winner.'],
  ['Strategic abstention', 'Under many methods staying home can produce a result you like better (the no-show paradox).'],
]

async function tryScenario(id: string | null) {
  const s = scenarios.value.find((x) => x.id === id)
  if (!s) return
  open.value = s
  await nextTick()
  labEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="rigging">
    <header class="hero">
      <div class="eyebrow">A field guide for the curious, and the suspicious</div>
      <h1>How to rig an election</h1>
      <p class="lede">
        You don't need to stuff ballot boxes. Every voting method has blind spots, and anyone who understands them can
        turn them into an advantage. There are four levers: the <strong>counting rule</strong>, the
        <strong>menu</strong> of candidates, the <strong>ballots</strong> voters cast, and the
        <strong>order</strong> things are decided in. This guide covers what the voting method itself allows;
        gerrymandering, turnout and misinformation are a different (and darker) book.
      </p>
    </header>

    <p v-if="error" class="notice">Could not reach the API: {{ error }}</p>

    <section ref="labEl" class="scenario-lab">
      <div v-if="open" class="card">
        <div class="row head">
          <h2>Try it: {{ open.title }}</h2>
          <button class="btn small" @click="open = null">Close</button>
        </div>
        <ScenarioLab :scenario="open" />
      </div>
    </section>

    <section class="concepts">
      <div class="card">
        <h3>The Condorcet winner</h3>
        <p>
          Compare candidates two at a time. A candidate who beats every rival in these one-on-one majority votes is the
          <strong>Condorcet winner</strong> (after the Marquis de Condorcet, 1785). Electing anyone else means a
          majority preferred the Condorcet winner to your pick. Plurality, instant runoff, Borda and the rated methods
          can all miss them.
        </p>
        <p>
          The catch: there may be no Condorcet winner at all. Ada can beat Bea, Bea beat Cal and Cal beat Ada, each by a
          real majority. This is the <strong>Condorcet paradox</strong>, and it is where agenda-setters and buriers
          do their work.
        </p>
        <div class="row">
          <RouterLink class="btn small" to="/learn/10">Play: one on one</RouterLink>
          <RouterLink class="btn small" to="/learn/11">Play: rock, paper, scissors</RouterLink>
        </div>
      </div>
      <div class="card">
        <h3>Arrow's impossibility theorem</h3>
        <p>
          Kenneth Arrow (1951) asked for a rule that turns any set of voter rankings into a ranking for society and
          is (1) always a consistent ranking, (2) respects unanimity, (3) ranks X against Y using only how voters rank
          X against Y (no spoilers), and (4) has no dictator. With three or more candidates,
          <strong>no rule can do all four</strong>. Every ranked method breaks at least one; which one it breaks is its
          personality.
        </p>
        <div class="row">
          <RouterLink class="btn small" to="/learn/15">Play: the wishlist</RouterLink>
          <RouterLink class="btn small" to="/lab">Check every election in the lab</RouterLink>
        </div>
      </div>
      <div class="card">
        <h3>Gibbard–Satterthwaite</h3>
        <p>
          The strategy-proofness twin of Arrow's theorem (Gibbard 1973, Satterthwaite 1975): with three or more
          candidates, every method that can elect any of them and is not a dictatorship sometimes rewards a voter for
          lying. Rigging can't be designed away. It can only be made rarer, riskier or harder to compute.
        </p>
        <div class="row">
          <RouterLink class="btn small" to="/learn/16">Play: everyone can be gamed</RouterLink>
        </div>
      </div>
    </section>

    <section>
      <h2>The tactics</h2>
      <dl class="tactics">
        <div v-for="[name, text] in TACTICS" :key="name" class="tactic">
          <dt>{{ name }}</dt>
          <dd>{{ text }}</dd>
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
          <p class="small muted"><strong>Used in:</strong> {{ m.used_in }}</p>
          <h4>How to rig it</h4>
          <ul class="rigs">
            <li v-for="r in m.rigging" :key="r.title">
              <strong>{{ r.title }}.</strong> {{ r.how }}
              <button v-if="r.scenario" class="btn small try" @click="tryScenario(r.scenario)">Try it</button>
            </li>
          </ul>
          <div class="badges" aria-label="Criteria">
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
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1rem;
}

.concepts p {
  font-size: 0.95rem;
}

.tactics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
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
  grid-template-columns: repeat(auto-fill, minmax(21rem, 1fr));
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
