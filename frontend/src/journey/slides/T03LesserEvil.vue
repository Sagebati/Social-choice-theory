<script setup lang="ts">
import { computed, ref } from 'vue'
import CandidateBar from '../../components/CandidateBar.vue'
import Challenge from '../../components/Challenge.vue'
import PersonaCard from '../../components/PersonaCard.vue'
import TallyBars from '../../components/TallyBars.vue'
import Takeaway from '../../components/Takeaway.vue'
import { betterOff, ERIK, honestBallots, NAMES, PERSONAS, type CastBallot } from '../../cast'
import { useTown } from '../../composables/useTown'
import TownFrame from '../TownFrame.vue'
import { changedGroups, verdicts } from '../town'

const ballots = ref<CastBallot[]>(honestBallots())
const { results } = useTown(() => ballots.value, () => ({}), ['plurality'])
const plurality = computed(() => results.value?.byMethod.plurality ?? null)
const changed = computed(() => changedGroups(ballots.value))
const verdict = computed(() => verdicts(ballots.value, ERIK, plurality.value?.winner ?? null))
const done = computed(
  () =>
    !!plurality.value?.decisive &&
    plurality.value.winner !== ERIK &&
    changed.value.length > 0 &&
    changed.value.every((g) => betterOff(g, ERIK, plurality.value!.winner)),
)

const changedNames = computed(() => changed.value.map((g) => PERSONAS[g].name).join(' and '))
// The other one-group fix, for the success message.
const otherFix = computed(() =>
  changed.value.includes(1) ? "Margaret's 3 voting Amira would have worked too." : "Leo's 7 voting Bruno would have worked too.",
)

function setBallot(i: number, b: CastBallot) {
  ballots.value = ballots.value.map((x, k) => (k === i ? b : x))
}
</script>

<template>
  <TownFrame title="The lesser evil" :seen="['plurality']" current="plurality">
    <template #story>
      <p>
        Put yourself in Leo's shoes. Leo's group loves Amira, but Amira is behind. Leo's second choice is Bruno, and
        Leo's last choice, Erik, is about to win.
      </p>
      <p>
        Would you still vote Amira? Voting for a "lesser evil" instead of your favourite is called
        <strong>compromising</strong>. Under plurality it is often the smart move.
      </p>
      <Challenge id="t3" :done="done">
        You can now change any group's mark: click a name on their ballot. Stop Erik by changing as few groups as
        possible, and only in ways those groups would welcome.
        <template #success>
          {{ changedNames }} voted tactically, and Riverton gets
          {{ NAMES[plurality!.winner] }}. {{ otherFix }}
        </template>
      </Challenge>
      <Takeaway after="t3">
        <p>
          Plurality punishes honesty: voters whose favourite is behind are better off abandoning them. Over time,
          support drains towards two big parties, which political scientists call <strong>Duverger's law</strong>.
          Whoever controls the story of who is "viable" (polls, media) controls who gets the tactical votes.
        </p>
      </Takeaway>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">Plurality count, live</div>
        <TallyBars v-if="plurality" :names="NAMES" :tallies="plurality.rounds[0].tallies" :winner="plurality.winner" unit="votes" />
        <p v-if="plurality && !plurality.decisive" class="small muted">Dead heat: a tie-break decides.</p>
      </div>
    </template>
    <template #town>
      <CandidateBar :winner="plurality?.winner" />
      <div class="voters-grid">
        <PersonaCard
          v-for="(b, i) in ballots"
          :key="i"
          :index="i"
          :ballot="b"
          style-of="mark"
          editable
          :verdict="verdict[i]"
          @update:ballot="setBallot(i, $event)"
        />
      </div>
    </template>
  </TownFrame>
</template>
