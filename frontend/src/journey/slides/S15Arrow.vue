<script setup lang="ts">
import { computed, ref } from 'vue'
import ArrowLab from '../../components/ArrowLab.vue'
import Challenge from '../../components/Challenge.vue'
import Takeaway from '../../components/Takeaway.vue'
import type { RuleId } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const tried = ref(new Map<RuleId, number>())
const best = computed(() => Math.max(0, ...tried.value.values()))
function checked(rule: RuleId, met: number) {
  tried.value = new Map(tried.value).set(rule, met)
}
</script>

<template>
  <SlideFrame title="Arrow's impossible wishlist" wide>
    <template #story>
      <p>
        Every method so far had a flaw. Surely someone has designed one without any? In 1951 the economist
        Kenneth Arrow wrote down four modest wishes for any method that turns voters' rankings into a ranking
        for society:
      </p>
      <ol class="wishes">
        <li><strong>Always a ranking.</strong> Whatever the ballots, the result is a consistent ranking.</li>
        <li><strong>Unanimity.</strong> If everyone prefers X to Y, so does society.</li>
        <li><strong>Independence.</strong> Society's verdict on X versus Y depends only on how voters rank X versus Y. No spoilers.</li>
        <li><strong>No dictator.</strong> No single voter always gets their way.</li>
      </ol>
      <p>
        The lab on the right does something Arrow couldn't: with three candidates and three voters there are only
        216 possible elections, so it simply checks them all.
      </p>
      <Challenge id="s15" :done="tried.size >= 4">
        Find a rule that grants all four wishes. Try at least four rules.
        <template #success>
          Your best so far grants {{ best }} of 4. Nobody will ever do better.
        </template>
      </Challenge>
      <Takeaway after="s15">
        <p>
          <strong>Arrow's impossibility theorem</strong>: with three or more candidates, no ranked voting rule
          grants all four wishes. Pairwise majority fails the first (the Condorcet paradox). Dictatorship grants the
          first three, at the price of the fourth. Everything else breaks unanimity or independence. Arrow won the
          Nobel prize in economics in 1972, partly for this.
        </p>
        <p>
          The way out is to change the question. Approval and score voting ask for more than a ranking, so they
          step outside Arrow's theorem, but as the next step shows, they still cannot escape strategy.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <div class="card">
        <ArrowLab @checked="checked" />
      </div>
    </template>
  </SlideFrame>
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
