<script setup lang="ts">
import { RouterLink } from 'vue-router'
import SlideFrame from '../SlideFrame.vue'

const summary = [
  ['Plurality', 'Spoilers and lesser-evil voting', 'Run a look-alike of your rival'],
  ['Instant runoff', 'Centre squeeze, non-monotonic', 'Rank a hopeless candidate first (push-over)'],
  ['Borda count', 'Rewards lying about lower preferences', 'Bury the rival, field clones'],
  ['Condorcet methods', 'Need a rule for cycles', 'Bury the Condorcet winner to fake a cycle'],
  ['Approval', 'Where to draw the line', 'Bullet vote'],
  ['Score / STAR', 'Honest nuance loses to exaggeration', 'Give only 0 and 5 stars'],
]
</script>

<template>
  <SlideFrame title="Your turn" wide>
    <template #story>
      <p>You've seen the two great impossibility results of voting:</p>
      <ul>
        <li><strong>Arrow:</strong> no ranked method is perfectly fair.</li>
        <li><strong>Gibbard–Satterthwaite:</strong> no method is immune to strategy.</li>
      </ul>
      <p>
        That doesn't make all methods equally bad. Each one has its own way of going wrong, and its own tricks
        for those who want to rig it.
      </p>
      <div class="row">
        <RouterLink class="btn primary" to="/sandbox">Open the sandbox</RouterLink>
        <RouterLink class="btn" to="/rigging">Read the rigging handbook</RouterLink>
        <RouterLink class="btn" to="/lab">Visit the theorem lab</RouterLink>
      </div>
    </template>
    <template #stage>
      <div class="card">
        <div class="eyebrow">Cheat sheet</div>
        <table class="sheet">
          <thead>
            <tr>
              <th scope="col">Method</th>
              <th scope="col">Weak spot</th>
              <th scope="col">How to rig it</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary" :key="row[0]">
              <th scope="row">{{ row[0] }}</th>
              <td>{{ row[1] }}</td>
              <td>{{ row[2] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </SlideFrame>
</template>

<style scoped>
.sheet {
  width: 100%;
  font-size: 0.9rem;
}

.sheet th,
.sheet td {
  text-align: left;
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid var(--grid);
  vertical-align: top;
}

.sheet thead th {
  font-size: 0.75rem;
  color: var(--ink-2);
}

a.btn {
  text-decoration: none;
}
</style>
