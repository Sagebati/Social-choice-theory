<script setup lang="ts">
import { computed } from 'vue'
import { BALLOT_KIND, METHOD_NAMES, winnerName } from '../election'
import type { Counterexample } from '../types'
import BallotList from './BallotList.vue'

// A method breaking a criterion: the election before (and after) the change.
const props = defineProps<{ example: Counterexample }>()
const kind = computed(() => BALLOT_KIND[props.example.method])
</script>

<template>
  <div class="cx">
    <p class="explanation">{{ example.explanation }}</p>
    <div class="sides">
      <div class="side">
        <div class="eyebrow">{{ example.after ? 'Before' : 'The election' }}</div>
        <BallotList :names="example.before.candidates" :ballots="example.before.ballots" :kind="kind" />
        <p class="small">
          {{ METHOD_NAMES[example.method] }} elects
          <strong>{{ winnerName(example.before.candidates, example.before_outcome) }}</strong>
        </p>
      </div>
      <div v-if="example.after && example.after_outcome" class="side">
        <div class="eyebrow">After</div>
        <BallotList :names="example.after.candidates" :ballots="example.after.ballots" :kind="kind" />
        <p class="small">
          {{ METHOD_NAMES[example.method] }} elects
          <strong>{{ winnerName(example.after.candidates, example.after_outcome) }}</strong>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.explanation {
  font-weight: 600;
}

.sides {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 0.75rem;
}

.side {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
}

.side p {
  margin: 0.5rem 0 0;
}
</style>
