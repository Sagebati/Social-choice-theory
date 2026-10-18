<script setup lang="ts">
import { computed, ref } from 'vue'
import Challenge from '../../components/Challenge.vue'
import ManipulationFinder from '../../components/ManipulationFinder.vue'
import ProfileEditor from '../../components/ProfileEditor.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { useElect } from '../../composables/useApi'
import { rankingsOnly } from '../../election'
import type { Election, ElectionInput } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const tab = ref<'bury' | 'team'>('bury')

// Burying: 50 Ada > Bea > Cal, 40 Bea > Ada > Cal; some Bea voters move Ada to last.
const buriers = ref(0)
const applied = ref<ElectionInput | null>(null)
const buryElection = computed<ElectionInput>(
  () =>
    applied.value ?? {
      candidates: ['Ada', 'Bea', 'Cal'],
      ballots: [
        { weight: 50, ranking: [0, 1, 2] },
        { weight: 40 - buriers.value, ranking: [1, 0, 2] },
        { weight: buriers.value, ranking: [1, 2, 0] },
      ].filter((b) => b.weight > 0),
    },
)
const honest: ElectionInput = {
  candidates: ['Ada', 'Bea', 'Cal'],
  ballots: [
    { weight: 50, ranking: [0, 1, 2] },
    { weight: 40, ranking: [1, 0, 2] },
  ],
}

// Teaming: Bea's party runs a look-alike, Bex.
const withBex = ref(false)
const teamElection = computed<ElectionInput>(() =>
  withBex.value
    ? {
        candidates: ['Ada', 'Bea', 'Bex'],
        ballots: [
          { weight: 30, ranking: [0, 1, 2] },
          { weight: 20, ranking: [1, 2, 0] },
        ],
      }
    : {
        candidates: ['Ada', 'Bea'],
        ballots: [
          { weight: 30, ranking: [0, 1] },
          { weight: 20, ranking: [1, 0] },
        ],
      },
)

const shown = computed(() => (tab.value === 'bury' ? buryElection.value : teamElection.value))
const { data } = useElect(() => shown.value, ['borda', 'irv', 'schulze'])
const borda = computed(() => data.value?.results[0].outcome ?? null)
const beaWins = computed(() => borda.value?.winner === 1 && !borda.value.used_tiebreak)

function apply(e: Election) {
  applied.value = rankingsOnly(e)
}
</script>

<template>
  <SlideFrame title="Bury the rival, field a twin">
    <template #story>
      <p>
        When told his method was easy to manipulate, Borda is said to have replied:
        <em>"My scheme is only intended for honest men."</em> Let's see why he worried.
      </p>
      <div class="row" role="tablist">
        <button class="btn small" role="tab" :aria-selected="tab === 'bury'" :class="{ primary: tab === 'bury' }" @click="tab = 'bury'">
          Trick 1: burying
        </button>
        <button class="btn small" role="tab" :aria-selected="tab === 'team'" :class="{ primary: tab === 'team' }" @click="tab = 'team'">
          Trick 2: teaming
        </button>
      </div>
      <template v-if="tab === 'bury'">
        <p>
          Honestly, Ada edges out Bea. Bea's voters really think Ada is their second choice. But what if they
          ranked Ada <em>last</em>, below hopeless Cal? That's <strong>burying</strong>.
        </p>
        <label v-if="!applied" class="slider">
          <span>Bea voters who bury Ada: <strong>{{ buriers }}</strong> of 40</span>
          <input v-model.number="buriers" type="range" min="0" max="40" aria-label="Number of buriers" />
        </label>
        <p v-else class="row small">
          Showing the lie the machine found.
          <button class="btn small" @click="applied = null">Back to the slider</button>
        </p>
        <Challenge id="s9" :done="beaWins">
          Make Bea win, with the slider or by asking the machine below for a lie and applying it.
          <template #success>Eleven buriers are enough. Nobody changed their mind about Bea; they just lied about Ada.</template>
        </Challenge>
        <div class="card">
          <div class="eyebrow">Ask the machine</div>
          <p class="small">
            The server tries every possible insincere ballot for every bloc of voters and reports the lies that
            pay off.
          </p>
          <ManipulationFinder :election="honest" method="borda" @apply="apply" />
        </div>
      </template>
      <template v-else>
        <p>
          With two candidates, Ada beats Bea 30 to 20. Now Bea's party nominates <strong>Bex</strong>, a near copy of
          Bea. Every voter ranks Bex right next to Bea.
        </p>
        <label class="row">
          <input v-model="withBex" type="checkbox" />
          Bea's party fields Bex
        </label>
        <p v-if="withBex" class="small">
          Bex wins nothing, but pushes Ada one place further down every Bea voter's ballot. That's
          <strong>teaming</strong>. Instant runoff and Schulze are not fooled.
        </p>
      </template>
      <Takeaway after="s9">
        <p>
          Borda lets the order of your <em>lower</em> preferences count, which is exactly what makes those
          preferences worth lying about.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <div class="card">
        <div class="eyebrow">The ballot box</div>
        <ProfileEditor :model-value="shown" lock-rankings lock-weights />
      </div>
      <div v-if="borda" class="card">
        <div class="eyebrow">Borda points</div>
        <TallyBars :names="shown.candidates" :tallies="borda.rounds[0].tallies" :winner="borda.winner" unit="points" />
      </div>
      <WinnerStrip v-if="data" :outcomes="data.results.map((r) => r.outcome)" :names="shown.candidates" />
    </template>
  </SlideFrame>
</template>

<style scoped>
.slider {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
</style>
