<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import Chip from '../../components/Chip.vue'
import DuelGraph from '../../components/DuelGraph.vue'
import DuelMatrix from '../../components/DuelMatrix.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import Predict from '../../components/Predict.vue'
import Takeaway from '../../components/Takeaway.vue'
import { CANDIDATES, ERIK, honestBallots, NAMES, PERSONAS } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const ballots = honestBallots()
const { results } = useTown(() => ballots, () => ({}), ['schulze'])
const pairwise = computed(() => results.value?.pairwise ?? null)
const guess = ref<number | null>(null)
const revealed = computed(() => guess.value !== null)

// The duel the reader is inspecting.
const a = ref(0)
const b = ref(1)
const sides = computed(() => {
  const forA = PERSONAS.map((p, g) => ({ p, g })).filter(({ p }) => p.ranking.indexOf(a.value) < p.ranking.indexOf(b.value))
  const forB = PERSONAS.map((p, g) => ({ p, g })).filter(({ p }) => p.ranking.indexOf(b.value) < p.ranking.indexOf(a.value))
  const sum = (xs: typeof forA) => xs.reduce((s, x) => s + x.p.voters, 0)
  return { forA, forB, a: sum(forA), b: sum(forB) }
})
const inspected = ref(new Set<string>())
function pick(x: number, y: number) {
  a.value = x
  b.value = y
  inspected.value = new Set([...inspected.value, [x, y].sort().join('-')])
}
const showTable = ref(false)
const seen = computed(() => (revealed.value ? ['plurality', 'two_round', 'irv', 'borda', 'schulze'] : ['plurality', 'two_round', 'irv', 'borda']) as ('plurality' | 'two_round' | 'irv' | 'borda' | 'schulze')[])
</script>

<template>
  <TownFrame title="One on one" :seen="seen" current="schulze">
    <template #story>
      <p>
        In 1785 the Marquis de Condorcet proposed the most natural test of all: pit the candidates against each other
        <strong>two at a time</strong>. Who would a majority choose, Amira or Bruno? Bruno or Camille? There are ten
        such duels.
      </p>
      <p>
        A candidate who wins <strong>every</strong> duel is the <strong>Condorcet winner</strong>. Whoever else
        you pick, a majority would have preferred the Condorcet winner. Methods that always elect them (Schulze,
        ranked pairs, Copeland, minimax) are called Condorcet methods.
      </p>
      <Predict v-model="guess" question="Who wins every duel?" :options="NAMES" :answer="pairwise?.condorcet_winner ?? null" />
      <template v-if="revealed && pairwise">
        <Challenge id="t11" :done="inspected.size >= 3">
          Pick two candidates under the diagram, or use the shortcuts, to see which groups side with whom. Inspect
          three duels.
          <template #success>
            Bruno beats everyone: Amira 18–12, Camille 19–11, Daniel 19–11, Erik 16–14. Fifth system, fifth mayor. And
            Erik, whom plurality elected, loses every single duel.
          </template>
        </Challenge>
        <Takeaway after="t11">
          <p>
            Same voters, five systems, five different mayors: Erik, Amira, Daniel, Camille, Bruno. Each system is
            "fair" by some definition, and each one asks a different question of the very same ballots.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <template v-if="revealed && pairwise">
          <DuelGraph :names="NAMES" :pairwise="pairwise" />
          <div class="duel">
            <div class="row small">
              <span class="eyebrow">Duel</span>
              <select v-model.number="a" aria-label="First candidate" @change="pick(a, b)">
                <option v-for="(c, i) in CANDIDATES" :key="i" :value="i" :disabled="i === b">{{ c.name }}</option>
              </select>
              vs
              <select v-model.number="b" aria-label="Second candidate" @change="pick(a, b)">
                <option v-for="(c, i) in CANDIDATES" :key="i" :value="i" :disabled="i === a">{{ c.name }}</option>
              </select>
            </div>
            <div class="sides">
              <div>
                <Chip :index="a" :name="NAMES[a]" strong /> <strong>{{ sides.a }}</strong>
                <ul><li v-for="x in sides.forA" :key="x.g">{{ x.p.name }} ×{{ x.p.voters }}</li></ul>
              </div>
              <div>
                <Chip :index="b" :name="NAMES[b]" strong /> <strong>{{ sides.b }}</strong>
                <ul><li v-for="x in sides.forB" :key="x.g">{{ x.p.name }} ×{{ x.p.voters }}</li></ul>
              </div>
            </div>
            <button class="btn small" @click="showTable = !showTable">{{ showTable ? 'Hide' : 'Show' }} all ten duels as a table</button>
            <DuelMatrix v-if="showTable" :names="NAMES" :pairwise="pairwise" />
            <div class="row quick">
              <button v-for="c in [0, 2, 3, 4]" :key="c" class="btn small" @click="pick(1, c)">Bruno vs {{ NAMES[c] }}</button>
              <button class="btn small" @click="pick(ERIK, 0)">Erik vs Amira</button>
            </div>
          </div>
        </template>
        <p v-else class="muted small">Make a prediction to hold the duels.</p>
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="revealed ? pairwise?.condorcet_winner : null" />
      <div class="voters-grid">
        <PersonaCard v-for="(bal, i) in ballots" :key="i" :index="i" :ballot="bal" style-of="ranked" />
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.duel {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sides {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.sides > div {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 0.5rem 0.65rem;
}

.sides ul {
  margin: 0.3rem 0 0;
  padding-left: 1rem;
  font-size: 0.88rem;
}

.quick {
  gap: 0.35rem;
}
</style>
