<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import RoundsView from '../../components/RoundsView.vue'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { betterOff, BRUNO, defaultScores, honestBallots, NAMES, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'
import { verdicts } from '../town'

const ANA = 2
// Honest stars: 5 for a favourite, then 4, 3, 1, 0.
const honest = (): CastBallot[] => honestBallots().map((b) => ({ ...b, scores: defaultScores(b.ranking) }))
const ballots = ref<CastBallot[]>(honest())
const { results } = useTown(() => ballots.value, () => ({}), ['score', 'star'])
const score = computed(() => results.value?.byMethod.score ?? null)
const star = computed(() => results.value?.byMethod.star ?? null)
const verdict = computed(() => verdicts(ballots.value, BRUNO, star.value?.winner ?? null))
const done = computed(() => !!star.value?.decisive && betterOff(ANA, BRUNO, star.value.winner))
const finalists = computed(() => {
  const r = star.value?.rounds[1]
  return r ? r.tallies.map((t, c) => (t === null ? -1 : c)).filter((c) => c >= 0) : []
})
const finalistNames = computed(() => finalists.value.map((c) => NAMES[c]).join(' and '))
const step = ref(1)

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
}
</script>

<template>
  <TownFrame title="Stars, and the urge to exaggerate" :seen="['plurality', 'two_round', 'irv', 'borda', 'schulze', 'approval', 'star']" current="star">
    <template #story>
      <p>
        <strong>Score voting</strong> asks how much: give each candidate 0 to 5 stars, like rating a restaurant. Highest
        total wins. Each group gives its favourite 5 stars, then 4, 3, 1 and 0. Camille collects the most stars, 101
        to Bruno's 97, matching the Borda count.
      </p>
      <p>
        <strong>STAR voting</strong> (Score Then Automatic Runoff) adds a second step: the two highest totals go to a
        runoff, and each ballot counts for whichever finalist it gave more stars. Bruno is starred above Camille on 19
        ballots out of 30, so under STAR Bruno wins.
      </p>
      <p>
        Stars invite exaggeration. Why give your second choice 4 stars if they are the threat? Ana's group would rather
        have Daniel than Bruno.
      </p>
      <Challenge id="t14" :done="done">
        Change Ana's stars (click a star; click it again to remove one) to get Ana's group a mayor they prefer to
        Bruno under STAR.
        <template #success>
          With Ana's new stars, {{ finalistNames }} reach the runoff and
          {{ NAMES[star!.winner] }} wins it. The machine's favourite version: five stars for Daniel and for Erik, none
          for anyone else, which knocks Bruno (and Camille) out of the runoff.
        </template>
      </Challenge>
      <Takeaway after="t14">
        <p>
          Exaggerating, giving only 0 or 5 stars, is the classic score-voting strategy, and once everyone does it score
          voting turns into approval voting. STAR's runoff takes some of the reward away, but as Ana's group shows, not
          all of it.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <WinnerStrip v-if="score && star" :outcomes="[score.view, star.view]" :names="NAMES" />
      <div v-if="star" class="card">
        <div class="eyebrow">STAR, round by round</div>
        <RoundsView v-model:step="step" :outcome="star.view" :names="NAMES" unit="stars" />
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="star?.winner" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="stars"
          :editable="i === ANA"
          :verdict="verdict[i]"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
