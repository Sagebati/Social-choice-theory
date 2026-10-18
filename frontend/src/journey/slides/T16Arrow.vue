<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ArrowLab from '../../components/ArrowLab.vue'
import Challenge from '../../components/Challenge.vue'
import RichText from '../../components/RichText'
import Takeaway from '../../components/Takeaway.vue'
import type { RuleId } from '../../types'
import TownFrame from '../TownFrame.vue'

const { t } = useI18n()
const WISHES = ['ranking', 'unanimity', 'independence', 'dictator'] as const
const tried = ref(new Map<RuleId, number>())
const best = computed(() => Math.max(0, ...tried.value.values()))
function checked(rule: RuleId, met: number) {
  tried.value = new Map(tried.value).set(rule, met)
}
</script>

<template>
  <TownFrame :title="t('journey.steps.arrow')">
    <template #story>
      <p>{{ t('t16.intro') }}</p>
      <ol class="wishes">
        <RichText v-for="w in WISHES" :key="w" tag="li" :text="t(`t16.wishes.${w}`)" />
      </ol>
      <p>{{ t('t16.lab') }}</p>
      <Challenge id="t16" :done="tried.size >= 4">
        {{ t('t16.challenge') }}
        <template #success>{{ t('t16.success', { best }) }}</template>
      </Challenge>
      <Takeaway after="t16">
        <RichText tag="p" :text="t('t16.lesson')" />
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <ArrowLab @checked="checked" />
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.wishes {
  margin: 0;
  padding-left: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
</style>
