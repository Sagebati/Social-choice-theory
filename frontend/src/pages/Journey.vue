<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProgress } from '../composables/useProgress'
import { CHAPTERS, SLIDES } from '../journey/slides'

const route = useRoute()
const router = useRouter()
const { reach } = useProgress()

const index = computed(() => {
  const n = Number(route.params.step ?? 1)
  return Number.isInteger(n) && n >= 1 && n <= SLIDES.length ? n - 1 : 0
})
const slide = computed(() => SLIDES[index.value])
const toolbox = computed(() =>
  SLIDES.slice(0, index.value + 1).flatMap((s, i) => s.unlocks.map((tool) => ({ ...tool, fresh: i === index.value }))),
)
const chapters = computed(() =>
  CHAPTERS.map((name) => ({
    name,
    steps: SLIDES.map((s, i) => ({ i, title: s.title })).filter((_, i) => SLIDES[i].chapter === name),
  })),
)

function go(i: number) {
  if (i < 0 || i >= SLIDES.length) return
  void router.push({ name: 'journey', params: { step: i + 1 } })
}

watch(
  index,
  (i) => {
    reach(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },
  { immediate: true },
)

// Page Up / Page Down step through the journey; arrow keys belong to the map.
function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
  if (event.key === 'PageDown') go(index.value + 1)
  if (event.key === 'PageUp') go(index.value - 1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="journey">
    <nav class="progress" aria-label="Journey steps">
      <div v-for="(chapter, c) in chapters" :key="chapter.name" class="chapter" :class="{ current: slide.chapter === chapter.name }">
        <span class="chapter-name">{{ c + 1 }}. {{ chapter.name }}</span>
        <span class="dots">
          <button
            v-for="step in chapter.steps"
            :key="step.i"
            class="dot"
            :class="{ done: step.i < index, here: step.i === index }"
            :aria-label="`Step ${step.i + 1}: ${step.title}`"
            :aria-current="step.i === index ? 'step' : undefined"
            :title="step.title"
            @click="go(step.i)"
          />
        </span>
      </div>
    </nav>

    <div class="eyebrow">Chapter {{ CHAPTERS.indexOf(slide.chapter) + 1 }} · {{ slide.chapter }} · step {{ index + 1 }} of {{ SLIDES.length }}</div>
    <component :is="slide.component" :key="slide.id" />

    <footer class="nav">
      <button class="btn" :disabled="index === 0" @click="go(index - 1)">← Back</button>
      <div class="toolbox" aria-label="Your toolbox">
        <span class="eyebrow">Toolbox</span>
        <span
          v-for="tool in toolbox"
          :key="tool.label"
          class="tool"
          :class="{ fresh: tool.fresh }"
          :title="tool.fresh ? `New: ${tool.label}` : tool.label"
        >
          <span aria-hidden="true">{{ tool.icon }}</span> {{ tool.label }}<span v-if="tool.fresh" class="new">new</span>
        </span>
      </div>
      <button v-if="index < SLIDES.length - 1" class="btn primary" @click="go(index + 1)">
        Next: {{ SLIDES[index + 1].title }} →
      </button>
    </footer>
  </div>
</template>

<style scoped>
.journey {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.progress {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--grid);
}

.chapter {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.chapter-name {
  font-size: 0.72rem;
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
}

.chapter.current .chapter-name {
  color: var(--ink);
}

.dots {
  display: flex;
  gap: 5px;
}

.dot {
  width: 22px;
  height: 8px;
  border-radius: 4px;
  border: none;
  background: var(--grid);
  padding: 0;
}

.dot.done {
  background: var(--ink-2);
}

.dot.here {
  background: var(--ink);
  width: 34px;
}

.nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--grid);
  padding-top: 1rem;
  flex-wrap: wrap;
}

.toolbox {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.toolbox .eyebrow {
  margin: 0 0.3rem 0 0;
}

.tool {
  font-size: 0.78rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: var(--surface-2);
  white-space: nowrap;
}

.tool.fresh {
  background: var(--ink);
  color: var(--surface);
  font-weight: 700;
}

.new {
  margin-left: 0.35rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

@media (max-width: 860px) {
  .chapter-name {
    display: none;
  }

  .progress {
    gap: 0.6rem;
  }
}
</style>
