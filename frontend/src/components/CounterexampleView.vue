<script setup lang="ts">
import { computed } from 'vue'
import { BALLOT_KIND, methodName, winnerName } from '../election'
import type { Counterexample } from '../types'
import BallotList from './BallotList.vue'
import RichText from './RichText'

// A method breaking a criterion: the election before (and after) the change.
const props = defineProps<{ example: Counterexample }>()
const kind = computed(() => BALLOT_KIND[props.example.method])
</script>

<template>
  <div class="cx">
    <p class="explanation">{{ example.explanation }}</p>
    <div class="sides">
      <div class="side">
        <div class="eyebrow">{{ example.after ? $t('counterexample.before') : $t('counterexample.election') }}</div>
        <BallotList :names="example.before.candidates" :ballots="example.before.ballots" :kind="kind" />
        <RichText
          tag="p"
          class="small"
          :text="
            $t('counterexample.elects', {
              method: methodName(example.method),
              winner: winnerName(example.before.candidates, example.before_outcome),
            })
          "
        />
      </div>
      <div v-if="example.after && example.after_outcome" class="side">
        <div class="eyebrow">{{ $t('counterexample.after') }}</div>
        <BallotList :names="example.after.candidates" :ballots="example.after.ballots" :kind="kind" />
        <RichText
          tag="p"
          class="small"
          :text="
            $t('counterexample.elects', {
              method: methodName(example.method),
              winner: winnerName(example.after.candidates, example.after_outcome),
            })
          "
        />
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
  grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
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
