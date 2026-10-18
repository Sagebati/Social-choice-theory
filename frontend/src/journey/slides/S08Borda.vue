<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Challenge from '../../components/Challenge.vue'
import Predict from '../../components/Predict.vue'
import ProfileEditor from '../../components/ProfileEditor.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { useElect } from '../../composables/useApi'
import type { ElectionInput } from '../../types'
import SlideFrame from '../SlideFrame.vue'

// The centre-squeeze election as ballots: Bea is everybody's first or second.
const election = ref<ElectionInput>({
  candidates: ['Ada', 'Bea', 'Cal'],
  ballots: [
    { weight: 35, ranking: [0, 1, 2] },
    { weight: 33, ranking: [2, 1, 0] },
    { weight: 32, ranking: [1, 0, 2] },
  ],
})
const names = computed(() => election.value.candidates)
const { data } = useElect(() => election.value, ['borda', 'plurality', 'irv'])
const borda = computed(() => data.value?.results[0].outcome ?? null)
const guess = ref<number | null>(null)
const firstWinner = ref<number | null>(null)
watch(borda, (o) => {
  if (firstWinner.value === null && o) firstWinner.value = o.winner
})
</script>

<template>
  <SlideFrame title="Points for everyone">
    <template #story>
      <p>
        In 1770 the French mathematician Jean-Charles de Borda proposed a different way to read a ranked ballot:
        give points. With three candidates, a first choice is worth <strong>2 points</strong>, a second choice
        <strong>1</strong> and a last choice <strong>0</strong>. Most points wins.
      </p>
      <p>Here is the squeezed-out election from before, as ballots.</p>
      <Predict v-model="guess" question="Who wins the Borda count?" :options="names" :answer="firstWinner" />
      <template v-if="guess !== null">
        <p>
          Bea collects second-place points from everyone, so the consensus candidate wins. Now try to undo that.
        </p>
        <Challenge id="s8" :done="borda?.winner === 2 && !borda.used_tiebreak">
          Without changing how many voters are in each bloc, reorder the ballots so that <strong>Cal</strong> wins
          the Borda count.
        </Challenge>
        <Takeaway after="s8">
          <p>
            Borda rewards candidates many people find acceptable. It can even beat a candidate whom an outright
            majority ranks first. Whether that is a feature or a bug is the oldest argument in voting theory.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #stage>
      <template v-if="guess !== null">
        <div class="card">
          <div class="eyebrow">The ballot box</div>
          <ProfileEditor v-model="election" lock-weights />
        </div>
        <div v-if="borda" class="card">
          <div class="eyebrow">Borda points</div>
          <TallyBars :names="names" :tallies="borda.rounds[0].tallies" :winner="borda.winner" unit="points" />
        </div>
        <WinnerStrip v-if="data" :outcomes="data.results.map((r) => r.outcome)" :names="names" />
      </template>
      <div v-else class="card">
        <div class="eyebrow">The ballot box</div>
        <ProfileEditor :model-value="election" lock-weights lock-rankings />
        <p class="muted small">Make a prediction to see the points.</p>
      </div>
    </template>
  </SlideFrame>
</template>
