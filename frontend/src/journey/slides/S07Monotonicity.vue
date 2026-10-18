<script setup lang="ts">
import { computed, ref } from 'vue'
import Challenge from '../../components/Challenge.vue'
import ProfileEditor from '../../components/ProfileEditor.vue'
import RoundsView from '../../components/RoundsView.vue'
import Takeaway from '../../components/Takeaway.vue'
import { useElect } from '../../composables/useApi'
import type { ElectionInput } from '../../types'
import SlideFrame from '../SlideFrame.vue'

// 39 Ada > Bea > Cal, 35 Bea > Cal > Ada, 26 Cal > Ada > Bea. Ada wins; then
// `converts` of Bea's voters start ranking Ada first.
const converts = ref(0)
const names = ['Ada', 'Bea', 'Cal']
const election = computed<ElectionInput>(() => ({
  candidates: names,
  ballots: [
    { weight: 39 + converts.value, ranking: [0, 1, 2] },
    { weight: 35 - converts.value, ranking: [1, 2, 0] },
    { weight: 26, ranking: [2, 0, 1] },
  ],
}))
const { data } = useElect(() => election.value, ['irv'])
const outcome = computed(() => data.value?.results[0].outcome ?? null)
const step = ref(0)
</script>

<template>
  <SlideFrame title="Winning by losing">
    <template #story>
      <p>
        Here are the ballots in a different town, written out as blocs: "39 voters rank Ada, then Bea, then Cal".
        Under instant runoff, Cal is eliminated first, every Cal voter's second choice is Ada, and Ada wins.
      </p>
      <p>
        Ada's campaign has a great week. Some of Bea's voters are won over and now rank Ada <em>first</em>.
        More support can only help Ada... right?
      </p>
      <label class="slider">
        <span>Bea voters who switch to <strong>Ada &gt; Bea &gt; Cal</strong>: <strong>{{ converts }}</strong></span>
        <input v-model.number="converts" type="range" min="0" max="14" step="1" aria-label="Number of converts" @input="step = 99" />
      </label>
      <Challenge id="s7" :done="outcome?.winner === 2 && !outcome.used_tiebreak">
        Find a number of new Ada supporters that makes Ada <strong>lose</strong>.
        <template #success>
          With 10 converts Bea drops below Cal and is eliminated instead. Bea's remaining voters flow to Cal, and Cal
          beats Ada 51 to 49. Ada lost by gaining votes.
        </template>
      </Challenge>
      <Takeaway after="s7">
        <p>
          Instant runoff is not <strong>monotonic</strong>. Now flip the story around. Those 10 converts really
          prefer Bea, then Cal, and like Ada least. By ranking Ada first they replaced Ada, their last choice, with
          Cal, their second. Ranking a candidate you dislike higher to change the elimination order is called
          <strong>push-over</strong>.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <div class="card">
        <div class="eyebrow">The ballot box</div>
        <ProfileEditor :model-value="election" lock-rankings lock-weights :highlight="converts ? [0, 1] : []" />
      </div>
      <div v-if="outcome" class="card">
        <RoundsView v-model:step="step" :outcome="outcome" :names="names" unit="votes" />
      </div>
    </template>
  </SlideFrame>
</template>

<style scoped>
.slider {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
</style>
