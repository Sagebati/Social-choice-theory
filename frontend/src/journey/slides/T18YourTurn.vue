<script setup lang="ts">
import { RouterLink } from 'vue-router'
import TownFrame from '../TownFrame.vue'

const SHEET = [
  ['One mark (plurality)', 'Elects a minority favourite; spoilers', 'Run a look-alike of your rival; vote for the lesser evil'],
  ['Two rounds', 'Gaining votes can lose; staying home can pay', 'Pick your runoff opponent (push-over)'],
  ['Instant runoff', 'Squeezes out the consensus candidate', 'Stay home, or rank a rival first to change the eliminations'],
  ['Borda points', 'Lower preferences are worth lying about', 'Bury the rival; field clones'],
  ['Head to head', 'Needs a rule for cycles', 'Bury the Condorcet winner to fake a cycle'],
  ['Approval', 'Where to draw the line', 'Bullet vote (which can backfire)'],
  ['Score / STAR', 'Honest nuance loses to exaggeration', 'Give only 0 or 5 stars'],
]
</script>

<template>
  <TownFrame title="Your turn">
    <template #story>
      <p>You have seen the two great impossibility results of voting:</p>
      <ul>
        <li><strong>Arrow:</strong> no ranked system is perfectly fair.</li>
        <li><strong>Gibbard–Satterthwaite:</strong> no system is immune to strategy.</li>
      </ul>
      <p>
        That doesn't make every system equally bad. Each has its own way of going wrong and its own tricks for those
        who want to rig it. Now build your own town.
      </p>
      <div class="row">
        <RouterLink class="btn primary" to="/sandbox">Open the sandbox</RouterLink>
        <RouterLink class="btn" to="/rigging">Read the rigging handbook</RouterLink>
        <RouterLink class="btn" to="/lab">Visit the theorem lab</RouterLink>
      </div>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">Cheat sheet</div>
        <table class="sheet">
          <thead>
            <tr>
              <th scope="col">System</th>
              <th scope="col">Weak spot</th>
              <th scope="col">How to rig it</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in SHEET" :key="row[0]">
              <th scope="row">{{ row[0] }}</th>
              <td>{{ row[1] }}</td>
              <td>{{ row[2] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.sheet {
  width: 100%;
  font-size: 0.88rem;
}

.sheet th,
.sheet td {
  text-align: left;
  padding: 0.4rem 0.45rem;
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
