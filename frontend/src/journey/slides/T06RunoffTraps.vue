<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import RoundsView from '../../components/RoundsView.vue'
import Takeaway from '../../components/Takeaway.vue'
import { AMIRA, betterOff, BRUNO, CAMILLE, DANIEL, ERIK, honestBallots, NAMES, PERSONAS, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const FRANK = 0
const tab = ref<'converts' | 'home'>('converts')

// Trap 1: some of Frank's group are won over and put Amira first.
const converts = ref(0)
// Trap 2: some of Frank's group stay home.
const home = ref<CastBallot[]>(honestBallots())

const ballots = computed<CastBallot[]>(() =>
  tab.value === 'converts'
    ? honestBallots().map((b, g) => (g === FRANK ? { ...b, voters: PERSONAS[FRANK].voters - converts.value } : b))
    : home.value,
)
const extra = computed<CastBallot[]>(() =>
  tab.value === 'converts' && converts.value > 0 ? [{ ranking: [AMIRA, ERIK, BRUNO, CAMILLE, DANIEL], voters: converts.value }] : [],
)
const { results } = useTown(() => ballots.value, () => ({ extra: extra.value }), ['two_round'])
const twoRound = computed(() => results.value?.byMethod.two_round ?? null)
const finalists = computed(() => {
  const r = twoRound.value?.rounds[1]
  return r ? r.tallies.map((t, c) => (t === null ? -1 : c)).filter((c) => c >= 0) : []
})
const step = ref(99)

const amiraLoses = computed(() => tab.value === 'converts' && !!twoRound.value?.decisive && twoRound.value.winner !== AMIRA)
const frankHome = computed(() => PERSONAS[FRANK].voters - (home.value[FRANK].voters ?? PERSONAS[FRANK].voters))
const homeHelps = computed(
  () =>
    tab.value === 'home' &&
    !!twoRound.value?.decisive &&
    home.value.some((b, g) => (b.voters ?? PERSONAS[g].voters) < PERSONAS[g].voters && betterOff(g, AMIRA, twoRound.value!.winner)),
)

function setHome(i: number, b: CastBallot) {
  home.value = home.value.map((x, k) => (k === i ? { ...x, voters: b.voters } : x))
}
</script>

<template>
  <TownFrame title="Two rounds, two traps" :seen="['plurality', 'two_round']" current="two_round">
    <template #story>
      <div class="row" role="tablist">
        <button class="btn small" role="tab" :aria-selected="tab === 'converts'" :class="{ primary: tab === 'converts' }" @click="tab = 'converts'">
          Trap 1: winning votes
        </button>
        <button class="btn small" role="tab" :aria-selected="tab === 'home'" :class="{ primary: tab === 'home' }" @click="tab = 'home'">
          Trap 2: staying home
        </button>
      </div>
      <template v-if="tab === 'converts'">
        <p>
          Amira's campaign has a great week: some of Frank's group are won over and now put Amira
          <em>first</em> (then Erik, Bruno, Camille, Daniel). More first-round votes for the winner. What could go
          wrong?
        </p>
        <label class="slider">
          <span>Frank's group members who switch to Amira: <strong>{{ converts }}</strong> of 9</span>
          <input v-model.number="converts" type="range" min="0" max="9" aria-label="Converts" @input="step = 99" />
        </label>
        <Challenge id="t6a" :done="amiraLoses">
          Find a number of converts that makes Amira <strong>lose</strong>.
          <template #success>
            With 4 converts Erik drops to 5 votes, below Camille's 6, so Amira's runoff opponent is no longer Erik but
            Camille, and Camille wins it 16–14. Amira lost by gaining votes.
          </template>
        </Challenge>
      </template>
      <template v-else>
        <p>
          Frank's group likes Amira least of all five. Use the − button on Frank's card to keep some of them at home
          on election day.
        </p>
        <Challenge id="t6b" :done="homeHelps">
          Find a way for some voters to get a better mayor by <strong>not voting</strong>.
          <template #success>
            With {{ frankHome }} of Frank's group at home, Erik falls behind Camille in round one, Camille beats Amira
            in the runoff, and Frank's group, who rank Camille third and Amira last, are better off for having
            stayed home.
          </template>
        </Challenge>
      </template>
      <Takeaway after="t6a">
        <p>
          A runoff is not <strong>monotonic</strong>: extra support can change who you meet in round two and cost you
          the race. It also fails <strong>participation</strong>: staying home can pay. And it invites
          <strong>push-over</strong> tactics: Margaret's 3 voters could back Daniel in round one and give Riverton
          Daniel, whom they prefer to Amira.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <RoundsView v-if="twoRound" v-model:step="step" :outcome="twoRound.view" :names="NAMES" unit="votes" />
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="twoRound?.winner" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="runoff"
          :finalists="finalists"
          :can-stay-home="tab === 'home'"
          @update:ballot="setHome(i, $event)"
        />
      </div>
      <p v-if="tab === 'converts' && converts > 0" class="notice small">
        {{ converts }} of Frank's group now vote Amira &gt; Erik &gt; Bruno &gt; Camille &gt; Daniel; Frank's card
        shows the {{ 9 - converts }} who didn't switch.
      </p>
    </template>
  </TownFrame>
</template>

<style scoped>
.slider {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
</style>
