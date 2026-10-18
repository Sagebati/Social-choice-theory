<script setup lang="ts">
import { computed, ref } from 'vue'
import ArrowLab from '../../components/ArrowLab.vue'
import Challenge from '../../components/Challenge.vue'
import Takeaway from '../../components/Takeaway.vue'
import type { RuleId } from '../../types'
import TownFrame from '../TownFrame.vue'

const tried = ref(new Map<RuleId, number>())
const best = computed(() => Math.max(0, ...tried.value.values()))
function checked(rule: RuleId, met: number) {
  tried.value = new Map(tried.value).set(rule, met)
}
</script>

<template>
  <TownFrame title="Arrow's impossible wishlist">
    <template #story>
      <p>
        In 1951 the economist Kenneth Arrow wrote down four modest wishes for any system that turns voters' rankings
        into a ranking for the town:
      </p>
      <ol class="wishes">
        <li><strong>Always a ranking.</strong> Whatever the ballots, the result is a consistent order.</li>
        <li><strong>Unanimity.</strong> If every voter prefers X to Y, so does the town.</li>
        <li>
          <strong>Independence.</strong> The town's verdict on X versus Y depends only on how voters rank X versus Y.
          In other words, no spoilers: in Riverton, withdrawing Amira should not have changed Erik versus Bruno.
        </li>
        <li><strong>No dictator.</strong> No single voter always gets their way.</li>
      </ol>
      <p>
        The lab checks a rule against every possible election with three candidates and three voters, all 216 of them,
        and shows a concrete counterexample for every wish the rule breaks.
      </p>
      <Challenge id="t16" :done="tried.size >= 4">
        Find a rule that grants all four wishes. Try at least four rules.
        <template #success>Your best so far grants {{ best }} of 4. Nobody will ever do better.</template>
      </Challenge>
      <Takeaway after="t16">
        <p>
          <strong>Arrow's impossibility theorem</strong>: with three or more candidates, no ranked voting rule grants
          all four wishes. Pairwise majority fails the first (that's the Condorcet paradox); dictatorship grants the
          first three at the price of the fourth; every real system breaks unanimity or independence. Arrow won the
          Nobel prize in economics in 1972, partly for this.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <ArrowLab @checked="checked" />
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.wishes {
  margin: 0;
  padding-left: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
</style>
