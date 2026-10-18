<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Challenge from '../../components/Challenge.vue'
import Chip from '../../components/Chip.vue'
import RichText from '../../components/RichText'
import Takeaway from '../../components/Takeaway.vue'
import { CANDIDATES, honestBallots, NAMES } from '../../cast'
import { useProgress } from '../../composables/useProgress'
import { useTown } from '../../composables/useTown'
import { listOf } from '../../i18n'
import type { MethodId } from '../../types'
import TownFrame from '../TownFrame.vue'

// Each system's name, question and rigging story are `t15.rows.<method>`.
const METHODS = ['plurality', 'two_round', 'irv', 'borda', 'schulze', 'approval', 'star'] as const satisfies readonly MethodId[]

const { t } = useI18n()
const ROWS = computed(() =>
  METHODS.map((method) => ({
    method,
    system: t(`t15.rows.${method}.system`),
    asks: t(`t15.rows.${method}.asks`),
    rig: t(`t15.rows.${method}.rig`),
  })),
)

const { progress } = useProgress()
const { results } = useTown(honestBallots, () => ({}), [...METHODS])
const winners = computed(() => METHODS.map((m) => results.value?.byMethod[m]?.winner ?? null))
const distinct = computed(() => new Set(winners.value.filter((w) => w !== null)).size)
const pick = computed(() => progress.pick)
const pickWins = computed(() => (pick.value === null ? [] : ROWS.value.filter((_, i) => winners.value[i] === pick.value).map((r) => r.system)))
</script>

<template>
  <TownFrame :title="t('journey.steps.fiveMayors')" :seen="[...METHODS]">
    <template #story>
      <p>{{ t('t15.intro', { n: distinct }) }}</p>
      <p v-if="pick !== null">
        <RichText :text="t('t15.pick', { name: CANDIDATES[pick].name })" />
        {{
          pickWins.length
            ? t('t15.pickWins', { name: CANDIDATES[pick].name, systems: listOf(pickWins) })
            : t('t15.pickNone', { name: CANDIDATES[pick].name })
        }}
      </p>
      <Challenge id="t15" :done="true">
        {{ t('t15.challenge') }}
        <template #success>{{ t('t15.success') }}</template>
      </Challenge>
      <Takeaway after="t15">
        <p>{{ t('t15.lesson') }}</p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <table class="recap">
          <thead>
            <tr>
              <th scope="col">{{ t('t15.system') }}</th>
              <th scope="col">{{ t('t15.mayor') }}</th>
              <th scope="col">{{ t('t15.asks') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in ROWS" :key="r.method">
              <th scope="row">{{ r.system }}</th>
              <td><Chip v-if="winners[i] !== null" :index="winners[i]!" :name="NAMES[winners[i]!]" strong /></td>
              <td class="small">{{ r.asks }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <template #town>
      <div class="card">
        <div class="eyebrow">{{ t('t15.rigsTitle') }}</div>
        <ul class="rigs">
          <RichText
            v-for="(r, i) in ROWS"
            :key="r.method"
            tag="li"
            :text="
              winners[i] !== null
                ? t('t15.rigItem', { system: r.system, winner: NAMES[winners[i]!], rig: r.rig })
                : t('t15.rigItemPending', { system: r.system, rig: r.rig })
            "
          />
        </ul>
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.recap {
  width: 100%;
  font-size: 0.9rem;
}

.recap th,
.recap td {
  text-align: left;
  padding: 0.4rem 0.45rem;
  border-bottom: 1px solid var(--grid);
  vertical-align: top;
}

.recap thead th {
  font-size: 0.75rem;
  color: var(--ink-2);
}

.rigs {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.92rem;
}
</style>
