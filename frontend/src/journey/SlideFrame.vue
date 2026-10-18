<script setup lang="ts">
// Layout of one step of the journey: the story on one side, the toy on the other.
defineProps<{ title: string; wide?: boolean }>()
</script>

<template>
  <article class="slide" :class="{ wide }">
    <div class="story">
      <h2>{{ title }}</h2>
      <slot name="story" />
    </div>
    <div class="stage">
      <slot name="stage" />
    </div>
  </article>
</template>

<style scoped>
.slide {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 2rem;
  align-items: start;
}

.slide.wide {
  grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
}

.story {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.story :deep(p) {
  margin: 0;
}

.stage {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 5rem;
}

@media (max-width: 860px) {
  .slide,
  .slide.wide {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }

  .stage {
    position: static;
  }
}
</style>
