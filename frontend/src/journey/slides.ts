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

/** A tool the reader picks up along the way; its label is `journey.tools.<id>`. */
export interface Tool {
  icon: string
  id: string
}

/** A step; its title is `journey.steps.<id>`. */
export interface Slide {
  id: string
  /** Index into CHAPTERS. */
  chapter: number
  component: Component
  /** What this step adds to the reader's toolbox. */
  unlocks: Tool[]
}

/** Chapter names are `journey.chapters.<id>`. */
export const CHAPTERS = ['town', 'oneMark', 'twoRounds', 'ranked', 'points', 'headToHead', 'rated', 'impossible']

export const SLIDES: Slide[] = [
  { id: 'town', chapter: 0, component: T01Town, unlocks: [{ icon: '👥', id: 'groups' }] },
  { id: 'oneMark', chapter: 1, component: T02OneMark, unlocks: [{ icon: '✗', id: 'mark' }] },
  { id: 'lesserEvil', chapter: 1, component: T03LesserEvil, unlocks: [{ icon: '🎭', id: 'tactical' }] },
  { id: 'spoiler', chapter: 1, component: T04Spoiler, unlocks: [{ icon: '🚪', id: 'withdraw' }] },
  { id: 'twoRounds', chapter: 2, component: T05TwoRounds, unlocks: [{ icon: '2️⃣', id: 'runoff' }] },
  { id: 'runoffTraps', chapter: 2, component: T06RunoffTraps, unlocks: [{ icon: '🏠', id: 'stayHome' }] },
  { id: 'instantRunoff', chapter: 3, component: T07Runoff, unlocks: [{ icon: '🔢', id: 'ranked' }, { icon: '🔁', id: 'transfers' }] },
  { id: 'stayHome', chapter: 3, component: T08StayHome, unlocks: [] },
  { id: 'borda', chapter: 4, component: T09Borda, unlocks: [{ icon: '🥇', id: 'points' }] },
  { id: 'bordaTricks', chapter: 4, component: T10BordaTricks, unlocks: [{ icon: '🕵️', id: 'lieFinder' }, { icon: '👯', id: 'twin' }] },
  { id: 'headToHead', chapter: 5, component: T11HeadToHead, unlocks: [{ icon: '⚔️', id: 'duels' }] },
  { id: 'fakeCycle', chapter: 5, component: T12FakeCycle, unlocks: [{ icon: '🔄', id: 'cycles' }] },
  { id: 'approval', chapter: 6, component: T13Approval, unlocks: [{ icon: '✅', id: 'ticks' }] },
  { id: 'stars', chapter: 6, component: T14Stars, unlocks: [{ icon: '⭐', id: 'stars' }] },
  { id: 'fiveMayors', chapter: 7, component: T15FiveMayors, unlocks: [{ icon: '📋', id: 'scoreboard' }] },
  { id: 'arrow', chapter: 7, component: T16Arrow, unlocks: [{ icon: '🏛️', id: 'arrow' }] },
  { id: 'gibbard', chapter: 7, component: T17RigMatrix, unlocks: [{ icon: '🧮', id: 'grid' }] },
  { id: 'yourTurn', chapter: 7, component: T18YourTurn, unlocks: [] },
]
