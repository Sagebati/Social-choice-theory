<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '../../api'
import Challenge from '../../components/Challenge.vue'
import ManipulabilityChart from '../../components/ManipulabilityChart.vue'
import Predict from '../../components/Predict.vue'
import Takeaway from '../../components/Takeaway.vue'
import { useLive } from '../../composables/useLive'
import { ALL_METHODS, METHOD_NAMES } from '../../election'
import type { MethodId } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const choices: MethodId[] = ['plurality', 'irv', 'borda', 'schulze', 'approval']
const options = choices.map((m) => METHOD_NAMES[m])
const guess = ref<number | null>(null)
const { data, loading, error } = useLive(() => (guess.value === null ? null : ALL_METHODS), (methods) => api.manipulability(methods, 3, 120))
const answer = computed(() => {
  if (!data.value) return null
  const rate = (m: MethodId) => data.value!.find((r) => r.method === m)?.rate ?? 1
  return choices.reduce((best, m, i) => (rate(m) < rate(choices[best]) ? i : best), 0)
})
</script>

<template>
  <SlideFrame title="Everyone can be gamed">
    <template #story>
      <p>
        Arrow's theorem is about fairness. Its cousin is about honesty. In 1973 and 1975, Allan Gibbard and Mark
        Satterthwaite proved that with three or more candidates, <strong>every</strong> voting method that is not a
        dictatorship (and can elect anyone) will, in some election, reward some voter for lying.
      </p>
      <p>
        So the useful question is how often. The server just generated random elections and, for each method,
        searched every possible lie by every bloc of voters.
      </p>
      <Predict
        v-model="guess"
        question="Which of these is hardest to game?"
        :options="options"
        :answer="answer"
      />
      <p v-if="loading && guess !== null" class="small muted">Searching every lie in every election…</p>
      <p v-if="error" class="notice">{{ error }}</p>
      <template v-if="data">
        <Challenge id="s16" :done="true">
          Look at the bottom of the chart.
          <template #success>
            Only dictatorship is never manipulable, exactly as the theorem says. Every other method can be gamed;
            some just make it rarer, or harder to pull off without knowing the numbers.
          </template>
        </Challenge>
        <Takeaway after="s16">
          <p>
            Gibbard's version of the theorem covers any kind of ballot, approvals and scores included. There is no
            perfect voting system. There are only trade-offs between flaws, and it pays to know which flaw you are
            choosing.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #stage>
      <div class="card">
        <div class="eyebrow">Share of random elections where some voters profit from lying</div>
        <ManipulabilityChart v-if="data" :data="data" :highlight="guess !== null ? choices[guess] : null" />
        <p v-else class="muted small">Make a prediction to run the experiment.</p>
      </div>
    </template>
  </SlideFrame>
</template>
