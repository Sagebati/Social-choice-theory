<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import RichText from '../../components/RichText'
import Takeaway from '../../components/Takeaway.vue'
import { CANDIDATES, honestBallots, PERSONAS, TOTAL_VOTERS } from '../../cast'
import { useProgress } from '../../composables/useProgress'
import { color, onColor } from '../../palette'
import TownFrame from '../TownFrame.vue'

const { t } = useI18n()
const { progress } = useProgress()
const ballots = honestBallots()
const opened = ref(new Set<number>())
// Everyone whose reasons were opened at least once; closing a card doesn't undo it.
const read = ref(new Set<number>())

function toggle(i: number) {
  const next = new Set(opened.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  opened.value = next
  read.value = new Set([...read.value, ...next])
}
</script>

<template>
  <TownFrame :title="t('journey.steps.town')">
    <template #story>
      <p>{{ t('t01.intro', { voters: TOTAL_VOTERS }) }}</p>
      <p>{{ t('t01.groups') }}</p>
      <RichText tag="p" :text="t('t01.rules')" />
      <Challenge id="t1" :done="read.size === PERSONAS.length">
        {{ t('t01.challenge', { read: read.size, total: PERSONAS.length }) }}
        <template #success>{{ t('t01.success') }}</template>
      </Challenge>
      <Takeaway after="t1">
        <p>{{ t('t01.lesson') }}</p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card stack">
        <div class="eyebrow">{{ t('t01.pickEyebrow') }}</div>
        <RichText tag="p" class="q" :text="t('t01.pickQuestion')" />
        <div class="row">
          <button
            v-for="(c, i) in CANDIDATES"
            :key="i"
            class="pick"
            :style="progress.pick === i ? { background: color(i), color: onColor(i), borderColor: color(i) } : {}"
            :aria-pressed="progress.pick === i"
            @click="progress.pick = i"
          >
            {{ c.name }}
          </button>
        </div>
        <p v-if="progress.pick !== null" class="small muted">
          {{ t('t01.noted', { name: CANDIDATES[progress.pick].name }) }}
        </p>
      </div>
    </template>
    <template #town>
      <CandidateBar pitch />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="reasons"
          :open="opened.has(i)"
          @toggle="toggle(i)"
        />
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.q {
  font-weight: 600;
  margin: 0;
}

.pick {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 999px;
  padding: 0.35em 1em;
  font-weight: 700;
}
</style>
