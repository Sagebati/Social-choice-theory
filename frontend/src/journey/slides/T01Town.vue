<script setup lang="ts">
import { ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import Takeaway from '../../components/Takeaway.vue'
import { CANDIDATES, honestBallots, PERSONAS, TOTAL_VOTERS } from '../../cast'
import { useProgress } from '../../composables/useProgress'
import { color, onColor } from '../../palette'
import TownFrame from '../TownFrame.vue'

const { progress } = useProgress()
const ballots = honestBallots()
const opened = ref(new Set<number>())
// Everyone whose reasons were opened at least once; closing a card doesn't undo it.
const read = ref(new Set<number>())

function toggle(i: number) {
  const next = new Set(opened.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  opened.value = next
  read.value = new Set([...read.value, ...next])
}
</script>

<template>
  <TownFrame title="Riverton elects a mayor">
    <template #story>
      <p>
        Riverton, population small, needs a new mayor. Five candidates are standing, and {{ TOTAL_VOTERS }} people
        will vote.
      </p>
      <p>
        To keep things readable, the voters fall into five groups. Everyone in a group ranks the candidates in
        exactly the same order, so each group has a spokesperson: Frank speaks for 9 voters, Leo for 7, and so on.
      </p>
      <p>
        <strong>Nobody changes their opinion in this story.</strong> What changes, step by step, is the voting
        system, and now and then how cleverly a group uses it. Watch who becomes mayor.
      </p>
      <Challenge id="t1" :done="read.size === PERSONAS.length">
        Get to know the voters: open each spokesperson's reasons below ({{ read.size }} of {{ PERSONAS.length }}).
        <template #success>You know Riverton now. Keep these five faces in mind.</template>
      </Challenge>
      <Takeaway after="t1">
        <p>
          Every honest ballot in this guide comes from these five rankings. When the mayor changes, it is because the
          rules changed, or because someone voted tactically. Never because anyone changed their mind.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card stack">
        <div class="eyebrow">Before we count anything</div>
        <p class="q">Knowing what everyone wants, who <em>should</em> be mayor?</p>
        <div class="row">
          <button
            v-for="(c, i) in CANDIDATES"
            :key="i"
            class="pick"
            :style="progress.pick === i ? { background: color(i), color: onColor(i), borderColor: color(i) } : {}"
            :aria-pressed="progress.pick === i"
            @click="progress.pick = i"
          >
            {{ c.name }}
          </button>
        </div>
        <p v-if="progress.pick !== null" class="small muted">
          Noted: {{ CANDIDATES[progress.pick].name }}. We'll come back to your choice at the end.
        </p>
      </div>
    </template>
    <template #town>
      <CandidateBar pitch />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="reasons"
          :open="opened.has(i)"
          @toggle="toggle(i)"
        />
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.q {
  font-weight: 600;
  margin: 0;
}

.pick {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 999px;
  padding: 0.35em 1em;
  font-weight: 700;
}
</style>
