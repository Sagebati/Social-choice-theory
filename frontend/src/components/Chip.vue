<script setup lang="ts">
import { color } from '../palette'

defineProps<{ index: number; name: string; strong?: boolean }>()
</script>

<template>
  <span class="chip" :class="{ strong }">
    <span class="dot" :style="{ background: color(index) }" aria-hidden="true" />{{ name }}
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  white-space: nowrap;
}

.strong {
  font-weight: 700;
}

.dot {
  width: 0.7em;
  height: 0.7em;
  border-radius: 50%;
  flex: none;
}
</style>
