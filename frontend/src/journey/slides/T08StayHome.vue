<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import RoundsView from '../../components/RoundsView.vue'
import Takeaway from '../../components/Takeaway.vue'
import { betterOff, DANIEL, honestBallots, NAMES, PERSONAS, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'
import { absentGroups, verdicts } from '../town'

const ballots = ref<CastBallot[]>(honestBallots())
const { results } = useTown(() => ballots.value, () => ({}), ['irv'])
const irv = computed(() => results.value?.byMethod.irv ?? null)
const step = ref(99)
const away = computed(() => absentGroups(ballots.value))
const verdict = computed(() => verdicts(ballots.value, DANIEL, irv.value?.winner ?? null))
const done = computed(
  () =>
    !!irv.value?.decisive &&
    away.value.length > 0 &&
    away.value.every((g) => betterOff(g, DANIEL, irv.value!.winner)),
)
const stayers = computed(() =>
  away.value.map((g) => `${PERSONAS[g].voters - (ballots.value[g].voters ?? PERSONAS[g].voters)} of ${PERSONAS[g].name}'s group`).join(' and '),
)

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
  step.value = 99
}
</script>

<template>
  <TownFrame title="Better off staying home" :seen="['plurality', 'two_round', 'irv']" current="irv">
    <template #story>
      <p>
        You would think that showing up and voting honestly can never hurt you. Under instant runoff it can. Use the
        − and + buttons on the cards to keep some voters at home and watch the count.
      </p>
      <Challenge id="t8" :done="done">
        Find a group whose members get a better mayor, by their own honest ranking, when some of them
        <strong>don't vote</strong>.
        <template #success>
          With {{ stayers }} at home, the order of eliminations changes and {{ NAMES[irv!.winner] }} wins instead of
          Daniel. They did better by not voting at all.
        </template>
      </Challenge>
      <Takeaway after="t8">
        <p>
          This is the <strong>no-show paradox</strong>: instant runoff fails <em>participation</em>. Two more traps
          from the same family: if 2 of Leo's group ranked Daniel first, Daniel would <em>lose</em> (to Camille),
          and if 3 more people like Margaret turned up, they would also hand the town to Camille, whom they like less
          than Daniel. Both fall out of how eliminations cascade.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <RoundsView v-if="irv" v-model:step="step" :outcome="irv.view" :names="NAMES" unit="votes" />
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="irv?.winner" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="ranked"
          can-stay-home
          :verdict="verdict[i]"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
