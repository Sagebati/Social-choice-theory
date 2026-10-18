<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProgress } from '../composables/useProgress'

// A small goal for the reader. Turns green while the goal holds, and remembers
// that it was reached once.
const props = defineProps<{ id: string; done: boolean; title?: string }>()
const { t } = useI18n()
const { solve, isSolved, isOpen, reveal } = useProgress()

watch(
  () => props.done,
  (done) => {
    if (done) solve(props.id)
  },
  { immediate: true },
)

const everSolved = computed(() => isSolved(props.id))
const skippable = computed(() => !props.done && !isOpen(props.id))
</script>

<template>
  <div class="challenge" :class="{ done }" role="status" :aria-live="done ? 'polite' : 'off'">
    <span class="box" aria-hidden="true">{{ done ? '✓' : '' }}</span>
    <div>
      <div class="eyebrow">{{ done ? t('challenge.done') : (title ?? t('challenge.yourTurn')) }}</div>
      <slot />
      <div v-if="done && $slots.success" class="success"><slot name="success" /></div>
      <div v-else-if="everSolved && !done" class="small muted">{{ t('challenge.solvedBefore') }}</div>
      <button v-if="skippable" class="skip small" @click="reveal(id)">{{ t('challenge.skip') }}</button>
    </div>
  </div>
</template>

<style scoped>
.challenge {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  border: 2px dashed var(--axis);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  transition: background 0.2s, border-color 0.2s;
}

.challenge.done {
  border-style: solid;
  border-color: var(--good);
  background: var(--good-bg);
}

.box {
  flex: none;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 6px;
  border: 2px solid var(--axis);
  display: grid;
  place-items: center;
  font-weight: 800;
  color: var(--surface);
  margin-top: 0.1rem;
}

.done .box {
  background: var(--good);
  border-color: var(--good);
}

.done .eyebrow {
  color: var(--good);
}

.success {
  margin-top: 0.4rem;
}

.skip {
  margin-top: 0.4rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
