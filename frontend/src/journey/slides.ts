import type { Component } from 'vue'
import T01Town from './slides/T01Town.vue'
import T02OneMark from './slides/T02OneMark.vue'
import T03LesserEvil from './slides/T03LesserEvil.vue'
import T04Spoiler from './slides/T04Spoiler.vue'
import T05TwoRounds from './slides/T05TwoRounds.vue'
import T06RunoffTraps from './slides/T06RunoffTraps.vue'
import T07Runoff from './slides/T07Runoff.vue'
import T08StayHome from './slides/T08StayHome.vue'
import T09Borda from './slides/T09Borda.vue'
import T10BordaTricks from './slides/T10BordaTricks.vue'
import T11HeadToHead from './slides/T11HeadToHead.vue'
import T12FakeCycle from './slides/T12FakeCycle.vue'
import T13Approval from './slides/T13Approval.vue'
import T14Stars from './slides/T14Stars.vue'
import T15FiveMayors from './slides/T15FiveMayors.vue'
import T16Arrow from './slides/T16Arrow.vue'
import T17RigMatrix from './slides/T17RigMatrix.vue'
import T18YourTurn from './slides/T18YourTurn.vue'

/** A tool the reader picks up along the way. */
export interface Tool {
  icon: string
  label: string
}

export interface Slide {
  id: string
  chapter: string
  title: string
  component: Component
  /** What this step adds to the reader's toolbox. */
  unlocks: Tool[]
}

export const CHAPTERS = [
  'Meet Riverton',
  'One mark',
  'Two rounds',
  'Rank everyone',
  'Points',
  'Head to head',
  'Ticks and stars',
  'The impossible ballot',
]

export const SLIDES: Slide[] = [
  { id: 'town', chapter: CHAPTERS[0], title: 'Riverton elects a mayor', component: T01Town, unlocks: [{ icon: '👥', label: 'Five voter groups' }] },
  { id: 'one-mark', chapter: CHAPTERS[1], title: 'One mark each', component: T02OneMark, unlocks: [{ icon: '✗', label: 'Single-mark ballot' }] },
  { id: 'lesser-evil', chapter: CHAPTERS[1], title: 'The lesser evil', component: T03LesserEvil, unlocks: [{ icon: '🎭', label: 'Vote for a group' }] },
  { id: 'spoiler', chapter: CHAPTERS[1], title: 'The spoiler', component: T04Spoiler, unlocks: [{ icon: '🚪', label: 'Withdraw a candidate' }] },
  { id: 'two-rounds', chapter: CHAPTERS[2], title: 'Two rounds', component: T05TwoRounds, unlocks: [{ icon: '2️⃣', label: 'Runoff ballot' }] },
  { id: 'runoff-traps', chapter: CHAPTERS[2], title: 'Two rounds, two traps', component: T06RunoffTraps, unlocks: [{ icon: '🏠', label: 'Stay home' }] },
  { id: 'instant-runoff', chapter: CHAPTERS[3], title: 'Rank them all', component: T07Runoff, unlocks: [{ icon: '🔢', label: 'Ranked ballot' }, { icon: '🔁', label: 'Vote transfers' }] },
  { id: 'stay-home', chapter: CHAPTERS[3], title: 'Better off staying home', component: T08StayHome, unlocks: [] },
  { id: 'borda', chapter: CHAPTERS[4], title: 'Points for every place', component: T09Borda, unlocks: [{ icon: '🥇', label: 'Points' }] },
  { id: 'borda-tricks', chapter: CHAPTERS[4], title: 'Bury the rival, field a twin', component: T10BordaTricks, unlocks: [{ icon: '🕵️', label: 'Lie finder' }, { icon: '👯', label: 'Twin candidate' }] },
  { id: 'head-to-head', chapter: CHAPTERS[5], title: 'One on one', component: T11HeadToHead, unlocks: [{ icon: '⚔️', label: 'Duels' }] },
  { id: 'fake-cycle', chapter: CHAPTERS[5], title: 'Faking a cycle', component: T12FakeCycle, unlocks: [{ icon: '🔄', label: 'Cycle detector' }] },
  { id: 'approval', chapter: CHAPTERS[6], title: 'Tick everyone you’d accept', component: T13Approval, unlocks: [{ icon: '✅', label: 'Ticks' }] },
  { id: 'stars', chapter: CHAPTERS[6], title: 'Stars, and the urge to exaggerate', component: T14Stars, unlocks: [{ icon: '⭐', label: 'Stars' }] },
  { id: 'five-mayors', chapter: CHAPTERS[7], title: 'Five systems, five mayors', component: T15FiveMayors, unlocks: [{ icon: '📋', label: 'Scoreboard' }] },
  { id: 'arrow', chapter: CHAPTERS[7], title: 'Arrow’s impossible wishlist', component: T16Arrow, unlocks: [{ icon: '🏛️', label: 'Arrow checker' }] },
  { id: 'gibbard', chapter: CHAPTERS[7], title: 'Everyone can be gamed', component: T17RigMatrix, unlocks: [{ icon: '🧮', label: 'Rigging grid' }] },
  { id: 'your-turn', chapter: CHAPTERS[7], title: 'Your turn', component: T18YourTurn, unlocks: [] },
]
