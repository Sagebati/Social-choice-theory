<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import PersonaLieFinder from '../../components/PersonaLieFinder.vue'
import RichText from '../../components/RichText'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { betterOff, BRUNO, CAMILLE, CLONE, honestBallots, NAMES, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'
import { changedGroups, verdicts } from '../town'

const { t } = useI18n()
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
  <TownFrame :title="t('journey.steps.bordaTricks')" :seen="['plurality', 'two_round', 'irv', 'borda']" current="borda">
    <template #story>
      <RichText tag="p" :text="t('t10.intro')" />
      <div class="row" role="tablist">
        <button class="btn small" role="tab" :aria-selected="tab === 'bury'" :class="{ primary: tab === 'bury' }" @click="tab = 'bury'">
          {{ t('t10.tabBury') }}
        </button>
        <button class="btn small" role="tab" :aria-selected="tab === 'team'" :class="{ primary: tab === 'team' }" @click="tab = 'team'">
          {{ t('t10.tabTeam') }}
        </button>
      </div>
      <template v-if="tab === 'bury'">
        <RichText tag="p" :text="t('t10.bury')" />
        <Challenge id="t10a" :done="buried">
          <RichText :text="t('t10.buryChallenge')" />
          <template #success>{{ t('t10.burySuccess') }}</template>
        </Challenge>
        <div class="card">
          <PersonaLieFinder method="borda" :ballots="honestBallots()" @apply="setBallot" />
        </div>
      </template>
      <template v-else>
        <RichText tag="p" :text="t('t10.team', { clone: CLONE.fullName })" />
        <label class="row">
          <input v-model="clone" type="checkbox" />
          <span>{{ t('t10.enter') }}</span>
        </label>
        <Challenge id="t10b" :done="teamed">
          {{ t('t10.teamChallenge') }}
          <template #success>{{ t('t10.teamSuccess', { irv: irv ? NAMES[irv.winner] : '…' }) }}</template>
        </Challenge>
      </template>
      <Takeaway after="t10a">
        <RichText tag="p" :text="t('t10.lesson')" />
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">{{ t('t10.live') }}</div>
        <TallyBars
          v-if="borda"
          :names="names"
          :tallies="borda.rounds[0].tallies"
          :winner="borda.winner"
          :unit="t('common.units.points')"
          sorted
        />
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
