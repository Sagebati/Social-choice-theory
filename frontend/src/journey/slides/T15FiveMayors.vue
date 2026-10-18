<script setup lang="ts">
import { computed } from 'vue'
import Challenge from '../../components/Challenge.vue'
import Chip from '../../components/Chip.vue'
import Takeaway from '../../components/Takeaway.vue'
import { CANDIDATES, honestBallots, NAMES } from '../../cast'
import { useProgress } from '../../composables/useProgress'
import { useTown } from '../../composables/useTown'
import type { MethodId } from '../../types'
import TownFrame from '../TownFrame.vue'

const ROWS: { method: MethodId; system: string; asks: string; rig: string }[] = [
  { method: 'plurality', system: 'One mark (plurality)', asks: 'Who has the most first choices?', rig: 'Leo’s group compromises on Bruno; withdrawing Amira hands Bruno the win.' },
  { method: 'two_round', system: 'Two rounds', asks: 'Of the top two by first choices, whom does a majority prefer?', rig: 'Four of Frank’s group switching to Amira, or staying home, make Amira lose.' },
  { method: 'irv', system: 'Instant runoff', asks: 'Who survives when the weakest are knocked out one by one?', rig: 'Some of Frank’s or Leo’s group staying home gets them Camille.' },
  { method: 'borda', system: 'Borda points', asks: 'Who has the best average place?', rig: 'Margaret’s group buries Camille; Bruno’s party fields a twin.' },
  { method: 'schulze', system: 'Head to head (Condorcet)', asks: 'Who beats everyone one on one?', rig: 'Ana’s group buries Bruno and fakes a cycle.' },
  { method: 'approval', system: 'Approval', asks: 'Whom do the most people accept?', rig: 'Nobody can, here; bullet votes backfire.' },
  { method: 'star', system: 'STAR', asks: 'Of the two best-rated, who is rated higher on more ballots?', rig: 'Ana’s group exaggerates its stars and gets Daniel.' },
]

const { progress } = useProgress()
const { results } = useTown(honestBallots, () => ({}), ROWS.map((r) => r.method))
const winners = computed(() => ROWS.map((r) => results.value?.byMethod[r.method]?.winner ?? null))
const distinct = computed(() => new Set(winners.value.filter((w) => w !== null)).size)
const pick = computed(() => progress.pick)
const pickWins = computed(() => (pick.value === null ? [] : ROWS.filter((_, i) => winners.value[i] === pick.value).map((r) => r.system)))
</script>

<template>
  <TownFrame title="Five systems, five mayors" :seen="ROWS.map((r) => r.method)">
    <template #story>
      <p>
        The same 30 voters. The same honest opinions from start to finish. And {{ distinct }} different mayors,
        depending only on how the ballots are counted.
      </p>
      <p v-if="pick !== null">
        At the start you said <strong>{{ CANDIDATES[pick].name }}</strong> should be mayor.
        <template v-if="pickWins.length">{{ CANDIDATES[pick].name }} wins under {{ pickWins.join(', ') }}.</template>
        <template v-else>No system on this list elects {{ CANDIDATES[pick].name }}.</template>
      </p>
      <Challenge id="t15" :done="true">
        Read the table: what each system really asks.
        <template #success>
          Each one answers a sensible question. They are just different questions, and with five candidates and a
          divided town, different questions have different answers.
        </template>
      </Challenge>
      <Takeaway after="t15">
        <p>
          So which mayor is the right one? Every system above has a flaw, and every one of them could be gamed by
          someone in Riverton. Is there a system without flaws? In 1951, an economist proved there is not.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <table class="recap">
          <thead>
            <tr>
              <th scope="col">System</th>
              <th scope="col">Mayor</th>
              <th scope="col">The question it asks</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in ROWS" :key="r.method">
              <th scope="row">{{ r.system }}</th>
              <td><Chip v-if="winners[i] !== null" :index="winners[i]!" :name="NAMES[winners[i]!]" strong /></td>
              <td class="small">{{ r.asks }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <template #town>
      <div class="card">
        <div class="eyebrow">How Riverton could have been rigged</div>
        <ul class="rigs">
          <li v-for="(r, i) in ROWS" :key="r.method">
            <strong>{{ r.system }}</strong>
            <span v-if="winners[i] !== null"> (honest result: {{ NAMES[winners[i]!] }})</span>: {{ r.rig }}
          </li>
        </ul>
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.recap {
  width: 100%;
  font-size: 0.9rem;
}

.recap th,
.recap td {
  text-align: left;
  padding: 0.4rem 0.45rem;
  border-bottom: 1px solid var(--grid);
  vertical-align: top;
}

.recap thead th {
  font-size: 0.75rem;
  color: var(--ink-2);
}

.rigs {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.92rem;
}
</style>
