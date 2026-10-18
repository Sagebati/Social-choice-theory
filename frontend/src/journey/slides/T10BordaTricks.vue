<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import PersonaLieFinder from '../../components/PersonaLieFinder.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { betterOff, BRUNO, CAMILLE, CLONE, honestBallots, NAMES, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'
import { changedGroups, verdicts } from '../town'

const tab = ref<'bury' | 'team'>('bury')
const ballots = ref<CastBallot[]>(honestBallots())
const clone = ref(false)
const shown = computed(() => (tab.value === 'bury' ? ballots.value : honestBallots()))
const { results } = useTown(() => shown.value, () => ({ clone: tab.value === 'team' && clone.value }), ['borda', 'irv'])
const borda = computed(() => results.value?.byMethod.borda ?? null)
const irv = computed(() => results.value?.byMethod.irv ?? null)
const names = computed(() => (tab.value === 'team' && clone.value ? [...NAMES, CLONE.name] : NAMES))
const changed = computed(() => changedGroups(ballots.value))
const verdict = computed(() => (tab.value === 'bury' ? verdicts(ballots.value, CAMILLE, borda.value?.winner ?? null) : []))
const buried = computed(
  () =>
    tab.value === 'bury' &&
    !!borda.value?.decisive &&
    changed.value.length === 1 &&
    betterOff(changed.value[0], CAMILLE, borda.value.winner),
)
const teamed = computed(() => tab.value === 'team' && clone.value && borda.value?.winner === BRUNO)

// On the teaming tab, show Gina right after Bruno on every ballot.
const displayed = computed<CastBallot[]>(() =>
  tab.value === 'team' && clone.value
    ? shown.value.map((b) => ({ ...b, ranking: b.ranking.flatMap((c) => (c === BRUNO ? [BRUNO, 5] : [c])) }))
    : shown.value,
)

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
}
</script>

<template>
  <TownFrame title="Bury the rival, field a twin" :seen="['plurality', 'two_round', 'irv', 'borda']" current="borda">
    <template #story>
      <p>
        When told his method was easy to manipulate, Borda is said to have replied:
        <em>"My scheme is only intended for honest men."</em> Two tricks show why he worried.
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
          Under Borda, the order of your <em>lower</em> preferences scores points too. So a group can push a rival down
          to the bottom of its ballot, below candidates it actually likes less. That's <strong>burying</strong>.
        </p>
        <Challenge id="t10a" :done="buried">
          Change the ranking of <strong>one</strong> group (use the ↑ buttons) so that Riverton gets a mayor that group
          prefers to Camille. Stuck? Ask the machine below.
          <template #success>
            Margaret's 3 voters only had to drop Camille from fourth place to last: Camille loses 3 points, and Bruno
            wins. Nobody changed their mind about Bruno.
          </template>
        </Challenge>
        <div class="card">
          <PersonaLieFinder method="borda" :ballots="honestBallots()" @apply="setBallot" />
        </div>
      </template>
      <template v-else>
        <p>
          Bruno's party has another idea: nominate <strong>{{ CLONE.fullName }}</strong>, Bruno's running mate. Gina
          stands for exactly what Bruno stands for, so every voter ranks Gina right after Bruno.
        </p>
        <label class="row">
          <input v-model="clone" type="checkbox" />
          <span>Gina enters the race</span>
        </label>
        <Challenge id="t10b" :done="teamed">
          Enter Gina and look at who wins the Borda count.
          <template #success>
            Gina wins nothing. But on every ballot Gina sits between Bruno and everyone ranked below Bruno, so
            Bruno gains a point over each of them, 30 points in all, and becomes mayor. Instant runoff, which only
            counts first choices, still elects {{ irv ? NAMES[irv.winner] : '…' }}.
          </template>
        </Challenge>
      </template>
      <Takeaway after="t10a">
        <p>
          Borda is the method most exposed to strategy: burying a rival, or running look-alike candidates
          (<strong>teaming</strong>), both buy points without changing a single voter's opinion.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">Borda points, live</div>
        <TallyBars v-if="borda" :names="names" :tallies="borda.rounds[0].tallies" :winner="borda.winner" unit="points" sorted />
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="borda?.winner" :clone="tab === 'team' && clone" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in displayed"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="points"
          :editable="tab === 'bury'"
          :verdict="verdict[i] ?? null"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
