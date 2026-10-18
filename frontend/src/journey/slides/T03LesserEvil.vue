<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import RichText from '../../components/RichText'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { betterOff, ERIK, honestBallots, NAMES, PERSONAS, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import { listOf } from '../../i18n'
import TownFrame from '../TownFrame.vue'
import { changedGroups, verdicts } from '../town'

const { t } = useI18n()
const ballots = ref<CastBallot[]>(honestBallots())
const { results } = useTown(() => ballots.value, () => ({}), ['plurality'])
const plurality = computed(() => results.value?.byMethod.plurality ?? null)
const changed = computed(() => changedGroups(ballots.value))
const verdict = computed(() => verdicts(ballots.value, ERIK, plurality.value?.winner ?? null))
const done = computed(
  () =>
    !!plurality.value?.decisive &&
    plurality.value.winner !== ERIK &&
    changed.value.length > 0 &&
    changed.value.every((g) => betterOff(g, ERIK, plurality.value!.winner)),
)

const changedNames = computed(() => listOf(changed.value.map((g) => PERSONAS[g].name)))
// The other one-group fix, for the success message.
const otherFix = computed(() => (changed.value.includes(1) ? t('t03.otherFixMargaret') : t('t03.otherFixLeo')))

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
}
</script>

<template>
  <TownFrame :title="t('journey.steps.lesserEvil')" :seen="['plurality']" current="plurality">
    <template #story>
      <p>{{ t('t03.shoes') }}</p>
      <RichText tag="p" :text="t('t03.compromising')" />
      <Challenge id="t3" :done="done">
        {{ t('t03.challenge') }}
        <template #success>
          {{ t('t03.success', { groups: changedNames, winner: NAMES[plurality!.winner] }, changed.length) }}
          {{ otherFix }}
        </template>
      </Challenge>
      <Takeaway after="t3">
        <RichText tag="p" :text="t('t03.lesson')" />
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">{{ t('t03.eyebrow') }}</div>
        <TallyBars
          v-if="plurality"
          :names="NAMES"
          :tallies="plurality.rounds[0].tallies"
          :winner="plurality.winner"
          :unit="t('common.units.votes')"
        />
        <p v-if="plurality && !plurality.decisive" class="small muted">{{ t('t03.deadHeat') }}</p>
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="plurality?.winner" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="mark"
          editable
          :verdict="verdict[i]"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
