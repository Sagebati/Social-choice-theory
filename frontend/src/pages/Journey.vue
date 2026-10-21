<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { approvalBallot, electionOf, type CastBallot } from '../cast'
import { listOf, locale } from '../i18n'
import { bullet, bury, compromise, honest, pushOver } from '../stage/plan'
import { chooseMode, type Mode } from '../stage/layout'
import { TownStage, type DeckData, type StageOptions } from '../stage/TownStage'
import '../stage/stage.css'
import type { BallotInput, ElectResponse, MethodId } from '../types'

// The journey: a full-screen slide deck played on Riverton's town square.
// The five elections it counts are asked of the server once, and approval again
// once the reader has ticked a ballot; the stage animates them slide by slide,
// and the address follows the slide (/learn/1 … /learn/14). The stage is laid
// out for the room it has: wide on a big screen, compact on a phone, upright or
// sideways; when the room changes enough, it is built again on the same slide.

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const deck = ref<HTMLElement | null>(null)
const root = ref<HTMLElement | null>(null)
const mode = ref<Mode>('wide')
const live = ref('')
const error = ref<string | null>(null)
const ready = ref(false)
const heading = ref('')
let stage: TownStage | null = null
let options: Omit<StageOptions, 'mode'> | null = null
let alive = true

const index = computed(() => {
  const n = Number(route.params.step ?? 1)
  return Number.isInteger(n) && n >= 1 && n <= TownStage.SLIDES ? n - 1 : 0
})

function go(i: number) {
  if (i < 0 || i >= TownStage.SLIDES) return
  void router.push({ name: 'journey', params: { step: i + 1 } })
}

const count = (ballots: CastBallot[], methods: MethodId[], extra: BallotInput[] = []) => api.elect(electionOf(ballots, extra), methods)
const outcome = (r: ElectResponse, m: MethodId) => {
  const found = r.results.find((x) => x.outcome.method === m)
  if (!found) throw new Error(`missing ${m}`)
  return found.outcome
}

async function load(): Promise<DeckData> {
  const [h, c, p, b, u] = await Promise.all([
    count(honest(), ['plurality', 'two_round', 'irv', 'borda', 'approval', 'schulze']),
    count(compromise(), ['plurality']),
    count(pushOver(), ['two_round']),
    count(bury(), ['borda']),
    count(bullet(), ['approval']),
  ])
  return {
    honest: {
      plurality: outcome(h, 'plurality'),
      two_round: outcome(h, 'two_round'),
      irv: outcome(h, 'irv'),
      borda: outcome(h, 'borda'),
      approval: outcome(h, 'approval'),
    },
    matrix: h.pairwise.matrix,
    condorcetWinner: h.pairwise.condorcet_winner ?? outcome(h, 'schulze').winner,
    condorcetLoser: h.pairwise.condorcet_loser ?? -1,
    cycle: h.pairwise.cycle ?? [],
    compromise: outcome(c, 'plurality'),
    pushOver: outcome(p, 'two_round'),
    bury: outcome(b, 'borda'),
    bullet: outcome(u, 'approval'),
  }
}

// Like a slide deck: →, Space or Enter go on (to the next beat, then the next
// slide), ← goes back a slide, Page Down skips to the next one.
function onKey(event: KeyboardEvent) {
  // Alt+← and the like belong to the browser.
  if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
  const onControl = !!target?.closest('a, button, [role="button"]')
  if (event.key === 'ArrowRight' || (!onControl && (event.key === ' ' || event.key === 'Enter'))) {
    event.preventDefault()
    stage?.advance()
  }
  if (event.key === 'PageDown') go(index.value + 1)
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') go(index.value - 1)
}

// The reader may turn reduced motion on or off while the deck is open.
const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
const onMotion = () => {
  if (options) options.reducedMotion = motion.matches
  if (stage) stage.reducedMotion = motion.matches
}

// The tab names the slide; after App's own title, which follows the language.
watchEffect(
  () => {
    if (heading.value) document.title = t('deck.tab', { n: index.value + 1, total: TownStage.SLIDES, title: heading.value, site: t('app.title') })
  },
  { flush: 'post' },
)

function build() {
  stage?.dispose()
  stage = options && root.value ? new TownStage(root.value, { ...options, mode: mode.value }) : null
  stage?.show(index.value)
}

// The deck's room decides the layout; the stage keeps its own scale within it.
// The window's resize is a second signal, for a turned phone.
function measure() {
  if (!deck.value) return
  const style = getComputedStyle(deck.value)
  const width = deck.value.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const next = chooseMode(width, deck.value.clientHeight - parseFloat(style.paddingBottom))
  if (next === mode.value) return
  mode.value = next
  if (stage) build()
}
const room = new ResizeObserver(measure)

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  motion.addEventListener('change', onMotion)
  window.addEventListener('resize', measure)
  measure()
  if (deck.value) room.observe(deck.value)
  let data: DeckData
  try {
    data = await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    return
  }
  if (!alive) return
  options = {
    t: (key, params) => t(key, params ?? {}),
    list: listOf,
    data,
    reducedMotion: motion.matches,
    navigate: go,
    open: (path) => void router.push(path),
    announce: (words) => (live.value = words),
    heading: (title) => (heading.value = title),
    approvalWith: async (ticks) => {
      // The reader's ballot joins the town's, honest and with Lucas's bullet vote.
      const extra = ticks.some(Boolean) ? [approvalBallot(ticks)] : []
      const [h, u] = await Promise.all([count(honest(), ['approval'], extra), count(bullet(), ['approval'], extra)])
      return { honest: outcome(h, 'approval'), bullet: outcome(u, 'approval') }
    },
  }
  ready.value = true
  build()
})

watch(index, (i) => stage?.show(i))
watch(locale, () => stage?.replay())

onBeforeUnmount(() => {
  alive = false
  window.removeEventListener('keydown', onKey)
  motion.removeEventListener('change', onMotion)
  room.disconnect()
  window.removeEventListener('resize', measure)
  document.title = t('app.title')
  stage?.dispose()
  stage = null
})
</script>

<template>
  <div ref="deck" class="deck" :class="mode === 'wide' ? 'wide' : 'compact'">
    <!-- The stage draws itself here: the town square, and the words and buttons around it. -->
    <div ref="root" />
    <p v-if="error" class="state notice">{{ t('common.apiError', { error }) }}</p>
    <p v-else-if="!ready" class="state muted">{{ t('deck.loading') }}</p>
    <p class="visually-hidden" aria-live="polite">{{ live }}</p>
  </div>
</template>

<style scoped>
.deck {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-block: 0 env(safe-area-inset-bottom, 0px);
}

/* On a phone the words and buttons keep their size; when they and the town do not fit, the deck scrolls. */
.deck.compact {
  overflow-y: auto;
  padding-bottom: 0;
}

.state {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
}
</style>
