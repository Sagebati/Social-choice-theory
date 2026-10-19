<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { approvalBallot, electionOf, type CastBallot } from '../cast'
import { listOf, locale } from '../i18n'
import { bullet, bury, compromise, honest, pushOver } from '../stage/plan'
import { TownStage, type DeckData } from '../stage/TownStage'
import '../stage/stage.css'
import type { BallotInput, ElectResponse, MethodId } from '../types'

// The journey: a full-screen slide deck played on Riverton's town square.
// The five elections it counts are asked of the server once, and approval again
// once the reader has ticked a ballot; the stage animates them slide by slide,
// and the address follows the slide (/learn/1 … /learn/14).

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const svg = ref<SVGSVGElement | null>(null)
const live = ref('')
const error = ref<string | null>(null)
const ready = ref(false)
let stage: TownStage | null = null
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

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  let data: DeckData
  try {
    data = await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    return
  }
  if (!alive || !svg.value) return
  stage = new TownStage(svg.value, {
    t: (key, params) => t(key, params ?? {}),
    list: listOf,
    data,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    navigate: go,
    open: (path) => void router.push(path),
    announce: (words) => (live.value = words),
    approvalWith: async (ticks) => {
      // The reader's ballot joins the town's, honest and with Lucas's bullet vote.
      const extra = ticks.some(Boolean) ? [approvalBallot(ticks)] : []
      const [h, u] = await Promise.all([count(honest(), ['approval'], extra), count(bullet(), ['approval'], extra)])
      return { honest: outcome(h, 'approval'), bullet: outcome(u, 'approval') }
    },
  })
  ready.value = true
  stage.show(index.value)
})

watch(index, (i) => stage?.show(i))
watch(locale, () => stage?.replay())

onBeforeUnmount(() => {
  alive = false
  window.removeEventListener('keydown', onKey)
  stage?.dispose()
  stage = null
})
</script>

<template>
  <div class="deck">
    <svg ref="svg" class="town-stage" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="t('deck.aria')" />
    <p v-if="error" class="state notice">{{ t('common.apiError', { error }) }}</p>
    <p v-else-if="!ready" class="state muted">{{ t('deck.loading') }}</p>
    <p class="turn">{{ t('deck.turn') }}</p>
    <p class="visually-hidden" aria-live="polite">{{ live }}</p>
  </div>
</template>

<style scoped>
.deck {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-block: 0 env(safe-area-inset-bottom, 0px);
}

.state {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
}

.turn {
  display: none;
}

@media (orientation: portrait) and (max-width: 700px) {
  .turn {
    display: block;
    position: absolute;
    top: 0.5rem;
    left: 0;
    right: 0;
    margin: 0;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--ink-2);
  }
}
</style>
