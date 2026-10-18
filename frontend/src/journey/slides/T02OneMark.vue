<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import Predict from '../../components/Predict.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { ERIK, honestBallots, NAMES, PERSONAS, TOTAL_VOTERS } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'

const ballots = honestBallots()
const { results } = useTown(() => ballots, () => ({}), ['plurality'])
const plurality = computed(() => results.value?.byMethod.plurality ?? null)
const guess = ref<number | null>(null)
const lastGuess = ref<number | null>(null)
const revealed = computed(() => guess.value !== null)

// How many voters rank the winner last? Counted from the personas themselves.
const lastPlace = computed(() => {
  const w = plurality.value?.winner ?? ERIK
  return PERSONAS.filter((p) => p.ranking[p.ranking.length - 1] === w).reduce((s, p) => s + p.voters, 0)
})
const lastOptions = ['0', '9', '16', '21']
const lastAnswer = computed(() => lastOptions.indexOf(String(lastPlace.value)))
</script>

<template>
  <TownFrame title="One mark each" :seen="revealed ? ['plurality'] : []" current="plurality">
    <template #story>
      <p>
        The simplest ballot there is: <strong>mark one name</strong>. The name with the most marks wins, majority or
        not. This is <strong>plurality</strong>, also called first past the post. The UK, the US, Canada and India
        elect their parliaments this way.
      </p>
      <p>Each group marks its favourite. That's all the ballot asks.</p>
      <Predict v-model="guess" question="Who becomes mayor?" :options="NAMES" :answer="plurality?.winner ?? null" />
      <template v-if="revealed && plurality">
        <p>
          {{ NAMES[plurality.winner] }} wins with
          <strong>{{ plurality.rounds[0].tallies[plurality.winner] }} of {{ TOTAL_VOTERS }}</strong> votes. That is
          not a majority: most of Riverton marked someone else.
        </p>
        <Predict
          v-model="lastGuess"
          :question="`Look at the ballots below. How many voters rank ${NAMES[plurality.winner]} dead last?`"
          :options="lastOptions"
          :answer="lastAnswer"
        />
        <Challenge id="t2" :done="lastGuess !== null">
          Answer the second question.
          <template #success>
            Leo's 7, Ana's 6 and Margaret's 3: {{ lastPlace }} voters, more than half the town, would rather have
            anyone but Erik. Plurality never asked them.
          </template>
        </Challenge>
        <Takeaway after="t2">
          <p>
            Plurality only reads each ballot's first line and throws the rest away. A candidate with a loyal minority
            can beat a field of candidates the majority likes better.
          </p>
        </Takeaway>
      </template>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">The count</div>
        <TallyBars
          v-if="revealed && plurality"
          :names="NAMES"
          :tallies="plurality.rounds[0].tallies"
          :winner="plurality.winner"
          unit="votes"
        />
        <p v-else class="muted small">Make a prediction to count the votes.</p>
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="revealed ? plurality?.winner : null" />
      <div class="voters-grid">
        <PersonaCard v-for="(b, i) in ballots" :key="i" :index="i" :ballot="b" style-of="mark" />
      </div>
    </template>
  </TownFrame>
</template>
