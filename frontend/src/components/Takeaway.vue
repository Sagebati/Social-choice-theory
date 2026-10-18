<script setup lang="ts">
import { computed } from 'vue'
import { useProgress } from '../composables/useProgress'

// The lesson of a step. With `after`, it waits until that challenge has been
// solved (or skipped): play first, then the explanation.
const props = defineProps<{ after?: string }>()
const { isOpen } = useProgress()
const shown = computed(() => !props.after || isOpen(props.after))
</script>

<template>
  <Transition name="reveal">
    <aside v-if="shown" class="takeaway">
      <div class="eyebrow">The lesson</div>
      <slot />
    </aside>
  </Transition>
</template>

<style scoped>
.takeaway {
  border-left: 4px solid var(--ink);
  padding: 0.3rem 0 0.3rem 0.9rem;
  font-size: 0.97rem;
}

.takeaway :deep(p:last-child) {
  margin-bottom: 0;
}

.reveal-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.reveal-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>
