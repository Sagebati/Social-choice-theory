<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import RichText from '../../components/RichText'
import RoundsView from '../../components/RoundsView.vue'
import Takeaway from '../../components/Takeaway.vue'
import { AMIRA, betterOff, BRUNO, CAMILLE, DANIEL, ERIK, honestBallots, NAMES, PERSONAS, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const { t } = useI18n()
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
  <TownFrame :title="t('journey.steps.runoffTraps')" :seen="['plurality', 'two_round']" current="two_round">
    <template #story>
      <div class="row" role="tablist">
        <button class="btn small" role="tab" :aria-selected="tab === 'converts'" :class="{ primary: tab === 'converts' }" @click="tab = 'converts'">
          {{ t('t06.tabConverts') }}
        </button>
        <button class="btn small" role="tab" :aria-selected="tab === 'home'" :class="{ primary: tab === 'home' }" @click="tab = 'home'">
          {{ t('t06.tabHome') }}
        </button>
      </div>
      <template v-if="tab === 'converts'">
        <RichText tag="p" :text="t('t06.converts')" />
        <label class="slider">
          <RichText :text="t('t06.slider', { n: converts })" />
          <input
            v-model.number="converts"
            type="range"
            min="0"
            max="9"
            :aria-label="t('t06.sliderAria')"
            @input="step = 99"
          />
        </label>
        <Challenge id="t6a" :done="amiraLoses">
          <RichText :text="t('t06.challengeConverts')" />
          <template #success>{{ t('t06.successConverts') }}</template>
        </Challenge>
      </template>
      <template v-else>
        <p>{{ t('t06.home') }}</p>
        <Challenge id="t6b" :done="homeHelps">
          <RichText :text="t('t06.challengeHome')" />
          <template #success>{{ t('t06.successHome', { n: frankHome }) }}</template>
        </Challenge>
      </template>
      <Takeaway after="t6a">
        <RichText tag="p" :text="t('t06.lesson')" />
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <RoundsView
          v-if="twoRound"
          v-model:step="step"
          :outcome="twoRound.view"
          :names="NAMES"
          :unit="t('common.units.votes')"
        />
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
        {{ t('t06.notice', { n: converts, rest: 9 - converts }, converts) }}
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
