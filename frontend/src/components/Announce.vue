<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

// A visually hidden, polite live region for a widget's result. It exists from
// the start, since screen readers ignore a region that arrives with its text,
// and only takes the latest text once it has stopped changing for `delay` ms,
// so a drag is read out once at the end rather than at every step. Mount it with
// the first result (v-if) when that result isn't news. Messages may carry
// RichText markup; it is dropped.
const props = withDefaults(defineProps<{ text: string; delay?: number }>(), { delay: 600 })

const plain = (s: string) => s.replace(/<[^>]*>/g, '')
// The text a widget mounts with is already on screen: only changes are news.
const shown = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => plain(props.text),
  (text) => {
    clearTimeout(timer)
    timer = setTimeout(() => (shown.value = text), props.delay)
  },
)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <p class="visually-hidden" aria-live="polite" aria-atomic="true">{{ shown }}</p>
</template>
