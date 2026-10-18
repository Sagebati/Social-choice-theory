<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import DuelGraph from '../../components/DuelGraph.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import PersonaLieFinder from '../../components/PersonaLieFinder.vue'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { BRUNO, CAMILLE, honestBallots, NAMES, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'
import { verdicts } from '../town'

const ANA = 2
const ballots = ref<CastBallot[]>(honestBallots())
const { results } = useTown(() => ballots.value, () => ({}), ['schulze', 'ranked_pairs', 'minimax', 'copeland'])
const pairwise = computed(() => results.value?.pairwise ?? null)
const schulze = computed(() => results.value?.byMethod.schulze ?? null)
const outcomes = computed(() => (results.value ? Object.values(results.value.byMethod).map((r) => r.view) : []))
const verdict = computed(() => verdicts(ballots.value, BRUNO, schulze.value?.winner ?? null))
const done = computed(() => schulze.value?.winner === CAMILLE && schulze.value.decisive && pairwise.value?.cycle !== null)

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
}
</script>

<template>
  <TownFrame title="Faking a cycle" :seen="['plurality', 'two_round', 'irv', 'borda', 'schulze']" current="schulze">
    <template #story>
      <p>
        Condorcet spotted a catch in his own idea. Sometimes nobody wins every duel: A beats B, B beats C and C beats
        A, like rock, paper, scissors. This is the <strong>Condorcet paradox</strong>. Every Condorcet method needs a
        rule for breaking such cycles, usually by ignoring the weakest link.
      </p>
      <p>
        Riverton has no cycle: Bruno is a clear Condorcet winner. But Ana's group, who want Camille, could
        <em>manufacture</em> one, by ranking Bruno lower than they really feel. That's <strong>burying</strong> again.
      </p>
      <Challenge id="t12" :done="done">
        Change only Ana's ballot (the ↑ buttons) so that Camille becomes mayor under the Condorcet methods.
        <template #success>
          Pushed below Amira or Erik on Ana's ballot, Bruno now loses that duel, so nobody beats everyone any more.
          The duels go round in a circle, and when the Condorcet methods break it at its weakest link, Camille comes
          out on top. Ana's six voters elected Camille without anyone changing their mind.
        </template>
      </Challenge>
      <div class="card">
        <PersonaLieFinder method="schulze" :ballots="honestBallots()" @apply="setBallot" />
      </div>
      <Takeaway after="t12">
        <p>
          Condorcet methods can only be manipulated by creating a cycle, which needs good information about everyone
          else's ballots, and it can backfire: if Bruno's supporters bury Camille in return, everybody loses. That
          makes them hard, but not impossible, to rig.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <DuelGraph v-if="pairwise" :names="NAMES" :pairwise="pairwise" />
      </div>
      <WinnerStrip v-if="outcomes.length" :outcomes="outcomes" :names="NAMES" />
    </template>
    <template #town>
      <CandidateBar :winner="schulze?.winner" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="ranked"
          :editable="i === ANA"
          :verdict="verdict[i]"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
