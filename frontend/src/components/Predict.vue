<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { color, onColor } from '../palette'

// "Before we count: who do you think wins?" The reader commits to a guess
// before the answer is shown, which is half the fun and most of the learning.
const props = defineProps<{ question: string; options: string[]; answer: number | null }>()
const guess = defineModel<number | null>({ default: null })
const { t } = useI18n()

const right = () => guess.value !== null && guess.value === props.answer
</script>

<template>
  <div class="predict">
    <div class="eyebrow">{{ t('predict.eyebrow') }}</div>
    <p class="q">{{ question }}</p>
    <div class="row">
      <button
        v-for="(name, i) in options"
        :key="i"
        class="opt"
        :class="{ picked: guess === i }"
        :style="guess === i ? { background: color(i), color: onColor(i) } : {}"
        :disabled="guess !== null"
        @click="guess = i"
      >
        {{ name }}
      </button>
    </div>
    <p v-if="guess !== null && answer !== null" class="verdict" :class="{ right: right() }">
      {{ t(right() ? 'predict.right' : 'predict.wrong', { answer: options[answer] }) }}
    </p>
  </div>
</template>

<style scoped>
.predict {
  border-radius: 12px;
  background: var(--surface-2);
  padding: 0.75rem 0.9rem;
}

.q {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.opt {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 999px;
  padding: 0.35em 1em;
  font-weight: 600;
}

.opt:disabled {
  cursor: default;
}

.opt:disabled:not(.picked) {
  opacity: 0.5;
}

.verdict {
  margin: 0.6rem 0 0;
  font-weight: 600;
}

.verdict.right {
  color: var(--good);
}
</style>
