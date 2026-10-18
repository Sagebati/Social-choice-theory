<script setup lang="ts">
import { computed, ref } from 'vue'
import Challenge from '../../components/Challenge.vue'
import Chip from '../../components/Chip.vue'
import DuelGraph from '../../components/DuelGraph.vue'
import ProfileEditor from '../../components/ProfileEditor.vue'
import Takeaway from '../../components/Takeaway.vue'
import { useElect } from '../../composables/useApi'
import { reorder } from '../../election'
import type { ElectionInput } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const names = ['Ada', 'Bea', 'Cal']
const election = ref<ElectionInput>({
  candidates: names,
  ballots: [
    { weight: 5, ranking: [0, 1, 2] },
    { weight: 4, ranking: [1, 2, 0] },
    { weight: 1, ranking: [2, 0, 1] },
  ],
})
const { data } = useElect(() => election.value, [])
const pairwise = computed(() => data.value?.pairwise ?? null)
const cycle = computed(() => pairwise.value?.cycle ?? null)

// The chair sets the order of duels. Candidates are re-listed in agenda order;
// the starting agenda puts Cal first, so Cal does not win by default.
const agenda = ref([2, 0, 1])
const { data: agendaData } = useElect(() => reorder(election.value, agenda.value), ['agenda'])
const agendaOutcome = computed(() => agendaData.value?.results[0].outcome ?? null)
const agendaWinner = computed(() => (agendaOutcome.value ? agenda.value[agendaOutcome.value.winner] : null))

function earlier(pos: number) {
  const a = [...agenda.value]
  ;[a[pos - 1], a[pos]] = [a[pos], a[pos - 1]]
  agenda.value = a
}
</script>

<template>
  <SlideFrame title="Rock, paper, scissors">
    <template #story>
      <p>
        Condorcet spotted the catch himself. Sometimes there is no Condorcet winner, even when every single voter
        has a perfectly sensible ranking.
      </p>
      <p>
        Three blocs of voters, three rankings that each go round the same circle: Ada &gt; Bea &gt; Cal, Bea &gt;
        Cal &gt; Ada, Cal &gt; Ada &gt; Bea.
      </p>
      <Challenge id="s11a" :done="cycle !== null">
        Change the size of the blocs until the majority goes in circles: Ada beats Bea, Bea beats Cal, and Cal beats
        Ada.
        <template #success>
          Every contest is won by a real majority, yet together they contradict each other. This is the
          <strong>Condorcet paradox</strong>: a group of rational individuals can be irrational as a group.
        </template>
      </Challenge>
      <template v-if="cycle">
        <p>
          Parliaments often vote on motions as a chain of duels: the first two face off, the winner meets the
          next, and so on. In a cycle, whoever enters last wins. So whoever sets the <strong>agenda</strong> picks
          the winner.
        </p>
        <div class="card agenda">
          <div class="eyebrow">You chair the meeting: set the agenda</div>
          <ol>
            <li v-for="(c, pos) in agenda" :key="c">
              <Chip :index="c" :name="names[c]" strong />
              <button v-if="pos > 0" class="btn small" :aria-label="`Move ${names[c]} earlier`" @click="earlier(pos)">↑ earlier</button>
            </li>
          </ol>
          <ul v-if="agendaOutcome" class="notes small">
            <li v-for="(n, i) in agendaOutcome.rounds[0].notes" :key="i">{{ n }}</li>
          </ul>
        </div>
        <Challenge id="s11b" :done="cycle !== null && agendaWinner === 2 && !agendaOutcome?.used_tiebreak">
          Order the agenda so that <strong>Cal</strong> wins.
        </Challenge>
      </template>
      <Takeaway after="s11a">
        <p>
          "The will of the majority" is not always a ranking. Every voting method has to break cycles somehow,
          and whoever controls the tie-breaking controls the result.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <div class="card">
        <div class="eyebrow">The ballot box</div>
        <ProfileEditor v-model="election" lock-rankings :max-weight="20" />
      </div>
      <div v-if="pairwise" class="card">
        <DuelGraph :names="names" :pairwise="pairwise" />
      </div>
    </template>
  </SlideFrame>
</template>

<style scoped>
.agenda ol {
  margin: 0.4rem 0;
  padding-left: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.agenda li {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.notes {
  margin: 0.4rem 0 0;
  padding-left: 1.1rem;
  color: var(--ink-2);
}
</style>
