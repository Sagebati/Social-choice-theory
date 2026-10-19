<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { color, initial, onColor } from '../palette'
import type { ElectionInput } from '../types'

// Edit blocs of voters: how many voters, and in what order they rank the
// candidates. Rankings are edited by nudging a candidate left (up the ballot).
const props = withDefaults(
  defineProps<{
    lockRankings?: boolean
    lockWeights?: boolean
    /** Allow adding and removing blocs. */
    structural?: boolean
    maxWeight?: number
    highlight?: number[]
  }>(),
  { lockRankings: false, lockWeights: false, structural: false, maxWeight: 99, highlight: () => [] },
)

const election = defineModel<ElectionInput>({ required: true })
const { t } = useI18n()

function update(fn: (e: ElectionInput) => void) {
  const copy: ElectionInput = {
    ...election.value,
    ballots: election.value.ballots.map((b) => ({ weight: b.weight, ranking: [...b.ranking] })),
  }
  fn(copy)
  election.value = copy
}

function setWeight(g: number, w: number) {
  update((e) => (e.ballots[g].weight = Math.max(0, Math.min(props.maxWeight, Math.round(w) || 0))))
}

function raise(g: number, pos: number) {
  if (pos === 0) return
  update((e) => {
    const r = e.ballots[g].ranking
    ;[r[pos - 1], r[pos]] = [r[pos], r[pos - 1]]
  })
}

function addBloc() {
  update((e) => e.ballots.push({ weight: 1, ranking: e.candidates.map((_, i) => i) }))
}

function removeBloc(g: number) {
  update((e) => e.ballots.splice(g, 1))
}
</script>

<template>
  <div class="profile">
    <div v-for="(b, g) in election.ballots" :key="g" class="bloc" :class="{ highlight: highlight.includes(g) }">
      <div class="weight">
        <template v-if="!lockWeights">
          <button class="step" :aria-label="t('profileEditor.fewer', { n: g + 1 })" @click="setWeight(g, b.weight - 1)">−</button>
          <input
            type="number"
            min="0"
            :max="maxWeight"
            :value="b.weight"
            :aria-label="t('profileEditor.votersIn', { n: g + 1 })"
            @change="setWeight(g, Number(($event.target as HTMLInputElement).value))"
          />
          <button class="step" :aria-label="t('profileEditor.more', { n: g + 1 })" @click="setWeight(g, b.weight + 1)">+</button>
        </template>
        <strong v-else class="fixed">{{ b.weight }}</strong>
        <span class="muted small">{{ t('profileEditor.voters', b.weight) }}</span>
      </div>
      <ol class="ranking" :aria-label="t('profileEditor.rankingAria', { n: g + 1 })">
        <li v-for="(c, pos) in b.ranking" :key="c">
          <button
            class="cand"
            :style="{ background: color(c), color: onColor(c) }"
            :disabled="lockRankings || pos === 0"
            :title="lockRankings || pos === 0 ? election.candidates[c] : t('profileEditor.moveUp', { name: election.candidates[c] })"
            :aria-label="
              t(lockRankings || pos === 0 ? 'profileEditor.position' : 'profileEditor.positionMovable', {
                pos: pos + 1,
                name: election.candidates[c],
              })
            "
            @click="raise(g, pos)"
          >
            <span v-if="!lockRankings && pos > 0" class="arrow" aria-hidden="true">‹</span>
            <span class="init" aria-hidden="true">{{ initial(election.candidates[c], election.candidates) }}</span>
            <span class="nm">{{ election.candidates[c] }}</span>
          </button>
          <span v-if="pos < b.ranking.length - 1" class="gt" aria-hidden="true">›</span>
        </li>
      </ol>
      <button v-if="structural && election.ballots.length > 1" class="btn small" @click="removeBloc(g)">{{ t('profileEditor.remove') }}</button>
    </div>
    <button v-if="structural" class="btn small" @click="addBloc">{{ t('profileEditor.addBloc') }}</button>
    <p v-if="!lockRankings" class="hint muted small">{{ t('profileEditor.hint') }}</p>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bloc {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  background: var(--surface-2);
}

.bloc.highlight {
  outline: 2px solid var(--ink);
}

.weight {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 8.5rem;
}

.weight input {
  width: 3.4rem;
  text-align: center;
  font: inherit;
  font-variant-numeric: tabular-nums;
  padding: 0.15rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
}

.fixed {
  min-width: 2.2rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.step {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  font-weight: 700;
  line-height: 1;
}

.ranking {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
}

.ranking li {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.cand {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  border: none;
  border-radius: 999px;
  padding: 0.25em 0.75em;
  font-weight: 700;
  font-size: 0.88rem;
}

.cand:disabled {
  cursor: default;
}

.cand:not(:disabled):hover {
  filter: brightness(1.08);
}

.init {
  display: none;
}

.arrow {
  opacity: 0.75;
}

.gt {
  color: var(--muted);
  font-weight: 700;
}

.hint {
  margin: 0;
}

@media (max-width: 520px) {
  .nm {
    display: none;
  }

  .init {
    display: inline;
  }
}
</style>
