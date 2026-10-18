<script setup lang="ts">
import Ledger from '../components/Ledger.vue'
import type { MethodId } from '../types'

// One step of the journey: the story and the count side by side, and the
// town (candidates and voters) underneath.
defineProps<{ title: string; seen?: MethodId[]; current?: MethodId | null }>()
</script>

<template>
  <article class="slide">
    <Ledger v-if="seen" :seen="seen" :current="current" />
    <div class="top">
      <div class="story">
        <h2>{{ title }}</h2>
        <slot name="story" />
      </div>
      <div class="panel">
        <slot name="panel" />
      </div>
    </div>
    <section class="town" :aria-label="$t('journey.town')">
      <slot name="town" />
    </section>
  </article>
</template>

<style scoped>
.slide {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

.story,
.panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.story :deep(p) {
  margin: 0;
}

.story > :deep(.btn) {
  align-self: flex-start;
}

.town {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.town :deep(.voters-grid) {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.6rem;
}

@media (max-width: 1100px) {
  .town :deep(.voters-grid) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .top {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }
}

@media (max-width: 620px) {
  .town :deep(.voters-grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 420px) {
  .town :deep(.voters-grid) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
