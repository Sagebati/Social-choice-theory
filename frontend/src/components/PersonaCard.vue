<script setup lang="ts">
import { computed } from 'vue'
import { CANDIDATES, CLONE, defaultApprovals, defaultScores, PERSONAS, type CastBallot } from '../cast'
import { color } from '../palette'

export type BallotStyle = 'reasons' | 'mark' | 'runoff' | 'ranked' | 'points' | 'approval' | 'stars'

// One persona and the ballot their whole group casts. The ballot's look follows
// the voting system: a single mark, a mark per round, a ranking, points, ticks
// or stars. Editable cards let the reader vote on the group's behalf.
const props = withDefaults(
  defineProps<{
    index: number
    ballot: CastBallot
    styleOf: BallotStyle
    editable?: boolean
    /** Let the reader keep some of the group at home. */
    canStayHome?: boolean
    /** Candidate this ballot currently counts for (runoff counts). */
    counting?: number | null
    /** Candidates out of the race. */
    out?: number[]
    /** The two finalists of a two-round vote. */
    finalists?: number[]
    /** Feedback after the reader changed the ballot. */
    verdict?: 'better' | 'worse' | 'same' | null
    open?: boolean
  }>(),
  { editable: false, canStayHome: false, counting: null, out: () => [], finalists: () => [], verdict: null, open: false },
)
const emit = defineEmits<{ 'update:ballot': [CastBallot]; toggle: [] }>()

const persona = computed(() => PERSONAS[props.index])
const voting = computed(() => props.ballot.voters ?? persona.value.voters)
const changed = computed(() => props.ballot.ranking.join() !== persona.value.ranking.join() || !!props.ballot.approvals || !!props.ballot.scores)
const approvals = computed(() => props.ballot.approvals ?? defaultApprovals(props.ballot.ranking))
const scores = computed(() => props.ballot.scores ?? defaultScores(props.ballot.ranking))
// The mark goes to the favourite still on the ballot.
const marked = computed(() => props.ballot.ranking.find((c) => !props.out.includes(c)) ?? null)
const runoffChoice = computed(() => {
  const [a, b] = props.finalists
  if (a === undefined || b === undefined) return null
  return props.ballot.ranking.indexOf(a) < props.ballot.ranking.indexOf(b) ? a : b
})

const nameOf = (c: number) => (c === 5 ? CLONE.name : CANDIDATES[c].name)

function update(patch: Partial<CastBallot>) {
  emit('update:ballot', { ...props.ballot, ...patch })
}

function mark(c: number) {
  update({ ranking: [c, ...props.ballot.ranking.filter((x) => x !== c)] })
}

function raise(pos: number) {
  if (pos === 0) return
  const r = [...props.ballot.ranking]
  ;[r[pos - 1], r[pos]] = [r[pos], r[pos - 1]]
  update({ ranking: r })
}

function toggleApproval(c: number) {
  const a = [...approvals.value]
  a[c] = !a[c]
  update({ approvals: a })
}

function setScore(c: number, s: number) {
  const next = [...scores.value]
  next[c] = next[c] === s ? s - 1 : s
  update({ scores: next })
}

function reset() {
  emit('update:ballot', { ranking: [...persona.value.ranking], voters: props.ballot.voters })
}

function stayHome(n: number) {
  update({ voters: Math.max(0, Math.min(persona.value.voters, n)) })
}
</script>

<template>
  <article class="persona" :class="[verdict ? `verdict-${verdict}` : '', { editable }]">
    <header class="head">
      <span class="avatar" aria-hidden="true">{{ persona.name.slice(0, 1) }}</span>
      <div class="who">
        <strong>{{ persona.name }}</strong>
        <span class="role">{{ persona.role }}</span>
      </div>
      <span class="voters" :title="`${persona.voters} voters in town think like ${persona.name}`">×{{ persona.voters }}</span>
    </header>

    <p v-if="styleOf === 'reasons'" class="why">
      <button class="why-toggle" :aria-expanded="open" @click="emit('toggle')">
        {{ open ? 'Hide reasons' : `Why does ${persona.name} vote this way?` }}
      </button>
      <span v-if="open">{{ persona.why }}</span>
    </p>

    <!-- A single mark. -->
    <ul v-if="styleOf === 'mark'" class="ballot" :aria-label="`${persona.name}'s ballot`">
      <li v-for="(cand, c) in CANDIDATES" :key="c" :class="{ on: marked === c, gone: out.includes(c) }">
        <button class="row-btn" :disabled="!editable || out.includes(c)" @click="mark(c)">
          <span class="box">{{ marked === c ? '✗' : '' }}</span>
          <span class="sw" :style="{ background: color(c) }" />{{ cand.name }}
        </button>
      </li>
    </ul>

    <!-- Two rounds: a mark in each. -->
    <table v-else-if="styleOf === 'runoff'" class="ballot runoff" :aria-label="`${persona.name}'s two ballots`">
      <thead>
        <tr><th /><th scope="col">Round 1</th><th scope="col">Round 2</th></tr>
      </thead>
      <tbody>
        <tr v-for="(cand, c) in CANDIDATES" :key="c" :class="{ on: ballot.ranking[0] === c || runoffChoice === c }">
          <th scope="row"><span class="sw" :style="{ background: color(c) }" />{{ cand.name }}</th>
          <td>
            <button class="box" :disabled="!editable" :aria-label="`Round 1: vote ${cand.name}`" @click="mark(c)">
              {{ ballot.ranking[0] === c ? '✗' : '' }}
            </button>
          </td>
          <td>
            <span v-if="finalists.includes(c)" class="box">{{ runoffChoice === c ? '✗' : '' }}</span>
            <span v-else class="muted">–</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- A ranking, possibly with Borda points. -->
    <ol v-else-if="styleOf === 'ranked' || styleOf === 'points' || styleOf === 'reasons'" class="ballot ranked" :aria-label="`${persona.name}'s ranking`">
      <li
        v-for="(c, pos) in ballot.ranking"
        :key="c"
        :class="{ out: out.includes(c), counting: counting === c }"
      >
        <span class="place">{{ pos + 1 }}</span>
        <span class="sw" :style="{ background: color(c) }" />
        <span class="nm">{{ nameOf(c) }}</span>
        <span v-if="styleOf === 'points'" class="pts">+{{ ballot.ranking.length - 1 - pos }}</span>
        <span v-if="counting === c" class="tag">counts here</span>
        <button v-if="editable && pos > 0" class="up" :aria-label="`Move ${nameOf(c)} up ${persona.name}'s ballot`" @click="raise(pos)">↑</button>
      </li>
    </ol>

    <!-- Ticks. -->
    <ul v-else-if="styleOf === 'approval'" class="ballot" :aria-label="`${persona.name}'s approvals`">
      <li v-for="(cand, c) in CANDIDATES" :key="c" :class="{ on: approvals[c] }">
        <button class="row-btn" :disabled="!editable" :aria-pressed="approvals[c]" @click="toggleApproval(c)">
          <span class="box">{{ approvals[c] ? '✓' : '' }}</span>
          <span class="sw" :style="{ background: color(c) }" />{{ cand.name }}
        </button>
      </li>
    </ul>

    <!-- Stars. -->
    <ul v-else-if="styleOf === 'stars'" class="ballot" :aria-label="`${persona.name}'s scores`">
      <li v-for="(cand, c) in CANDIDATES" :key="c" class="on">
        <span class="sw" :style="{ background: color(c) }" />
        <span class="nm">{{ cand.name }}</span>
        <span class="stars" :aria-label="`${scores[c]} of 5`">
          <button
            v-for="k in 5"
            :key="k"
            class="star"
            :class="{ lit: k <= scores[c] }"
            :disabled="!editable"
            :aria-label="`Give ${cand.name} ${k} stars`"
            @click="setScore(c, k)"
          >★</button>
        </span>
      </li>
    </ul>

    <div v-if="canStayHome" class="home">
      <span class="small">Voting: <strong>{{ voting }}</strong> of {{ persona.voters }}</span>
      <button class="step" :disabled="voting === 0" :aria-label="`One more of ${persona.name}'s group stays home`" @click="stayHome(voting - 1)">−</button>
      <button class="step" :disabled="voting === persona.voters" :aria-label="`One more of ${persona.name}'s group votes`" @click="stayHome(voting + 1)">+</button>
    </div>

    <footer v-if="editable || verdict" class="foot">
      <span v-if="verdict === 'better'" class="pill good">Better mayor for {{ persona.name }}</span>
      <span v-else-if="verdict === 'worse'" class="pill bad">Worse for {{ persona.name }}</span>
      <span v-else-if="verdict === 'same'" class="pill">No change for {{ persona.name }}</span>
      <button v-if="editable && changed" class="btn small" @click="reset">Honest ballot</button>
    </footer>
  </article>
</template>

<style scoped>
.persona {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.7rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.persona.editable {
  border-style: dashed;
  border-color: var(--axis);
}

.verdict-better {
  box-shadow: 0 0 0 2px var(--good);
}

.verdict-worse {
  box-shadow: 0 0 0 2px var(--bad);
}

.head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  background: var(--surface-2);
  border: 2px solid var(--ink-2);
  display: grid;
  place-items: center;
  font-weight: 800;
  flex: none;
}

.who {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.role {
  font-size: 0.75rem;
  color: var(--ink-2);
  line-height: 1.25;
}

.voters {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  background: var(--ink);
  color: var(--surface);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  font-size: 0.85rem;
}

.why {
  font-size: 0.85rem;
  color: var(--ink-2);
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.why-toggle {
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 3px;
  color: var(--ink);
  font-size: 0.85rem;
}

.ballot {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.86rem;
}

.ballot li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--muted);
}

.ballot li.on {
  color: var(--ink);
  font-weight: 700;
}

.ballot li.gone {
  text-decoration: line-through;
}

.row-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  background: none;
  padding: 0.1rem 0;
  font: inherit;
  color: inherit;
  width: 100%;
  text-align: left;
}

.row-btn:disabled {
  cursor: default;
}

.editable .row-btn:hover {
  background: var(--surface-2);
  border-radius: 6px;
}

.box {
  width: 1.15rem;
  height: 1.15rem;
  border: 1.5px solid var(--axis);
  border-radius: 4px;
  display: inline-grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 800;
  flex: none;
  background: var(--surface);
  color: var(--ink);
  padding: 0;
}

button.box:not(:disabled):hover {
  border-color: var(--ink);
}

.sw {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
  margin-right: 0.3rem;
}

.ranked li {
  color: var(--ink);
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 6px;
}

.ranked li.out {
  color: var(--muted);
  text-decoration: line-through;
  font-weight: 400;
}

.ranked li.counting {
  background: var(--surface-2);
  outline: 2px solid var(--ink);
}

.place {
  width: 1.1rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink-2);
  font-weight: 700;
}

.nm {
  flex: 1;
  min-width: 0;
}

.pts {
  font-variant-numeric: tabular-nums;
  color: var(--ink-2);
  font-weight: 700;
}

.tag {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.up {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 6px;
  width: 1.5rem;
  height: 1.4rem;
  padding: 0;
  font-weight: 800;
}

.runoff {
  border-collapse: collapse;
  width: 100%;
}

.runoff th,
.runoff td {
  padding: 1px 2px;
  text-align: left;
  font-weight: inherit;
  color: var(--muted);
}

.runoff thead th {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.runoff tr.on th,
.runoff tr.on td {
  color: var(--ink);
  font-weight: 700;
}

.stars {
  display: inline-flex;
}

.star {
  border: none;
  background: none;
  padding: 0 1px;
  color: var(--grid);
  font-size: 1rem;
  line-height: 1;
}

.star.lit {
  color: var(--ink);
}

.star:disabled {
  cursor: default;
}

.home {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.home .small {
  flex: 1;
}

.step {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  font-weight: 800;
  padding: 0;
}

.foot {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}
</style>
