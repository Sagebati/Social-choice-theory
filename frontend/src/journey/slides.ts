import type { Component } from 'vue'
import S01Map from './slides/S01Map.vue'
import S02Crowd from './slides/S02Crowd.vue'
import S03Spoiler from './slides/S03Spoiler.vue'
import S04LesserEvil from './slides/S04LesserEvil.vue'
import S05Runoff from './slides/S05Runoff.vue'
import S06Squeeze from './slides/S06Squeeze.vue'
import S07Monotonicity from './slides/S07Monotonicity.vue'
import S08Borda from './slides/S08Borda.vue'
import S09BordaGaming from './slides/S09BordaGaming.vue'
import S10HeadToHead from './slides/S10HeadToHead.vue'
import S11Cycle from './slides/S11Cycle.vue'
import S12Burying from './slides/S12Burying.vue'
import S13Approval from './slides/S13Approval.vue'
import S14Score from './slides/S14Score.vue'
import S15Arrow from './slides/S15Arrow.vue'
import S16Gibbard from './slides/S16Gibbard.vue'
import S17YourTurn from './slides/S17YourTurn.vue'

/** A tool the reader picks up along the way; the sandbox offers them all. */
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
  'One person, one mark',
  'Rank everyone',
  'Points for everyone',
  'Head to head',
  'Grade, don’t rank',
  'The impossible ballot',
  'Your turn',
]

export const SLIDES: Slide[] = [
  { id: 'map', chapter: CHAPTERS[0], title: 'Where do you stand?', component: S01Map, unlocks: [{ icon: '🗺️', label: 'Opinion map' }] },
  { id: 'crowd', chapter: CHAPTERS[0], title: 'Everybody votes', component: S02Crowd, unlocks: [{ icon: '✗', label: 'Plurality' }] },
  { id: 'spoiler', chapter: CHAPTERS[0], title: 'The spoiler', component: S03Spoiler, unlocks: [{ icon: '⚠️', label: 'Spoiler detector' }] },
  { id: 'lesser-evil', chapter: CHAPTERS[0], title: 'The lesser evil', component: S04LesserEvil, unlocks: [{ icon: '🎭', label: 'Strategic voters' }] },
  { id: 'runoff', chapter: CHAPTERS[1], title: 'Rank them all', component: S05Runoff, unlocks: [{ icon: '🔢', label: 'Ranked ballots' }, { icon: '🔁', label: 'Instant runoff' }] },
  { id: 'squeeze', chapter: CHAPTERS[1], title: 'Squeezed out', component: S06Squeeze, unlocks: [{ icon: '🎨', label: 'Yee map' }] },
  { id: 'monotonicity', chapter: CHAPTERS[1], title: 'Winning by losing', component: S07Monotonicity, unlocks: [{ icon: '🗳️', label: 'Ballot box' }] },
  { id: 'borda', chapter: CHAPTERS[2], title: 'Points for everyone', component: S08Borda, unlocks: [{ icon: '🥇', label: 'Borda count' }] },
  { id: 'borda-gaming', chapter: CHAPTERS[2], title: 'Bury the rival, field a twin', component: S09BordaGaming, unlocks: [{ icon: '🕵️', label: 'Lie finder' }] },
  { id: 'condorcet', chapter: CHAPTERS[3], title: 'One on one', component: S10HeadToHead, unlocks: [{ icon: '⚔️', label: 'Duel diagram' }] },
  { id: 'cycle', chapter: CHAPTERS[3], title: 'Rock, paper, scissors', component: S11Cycle, unlocks: [{ icon: '🔄', label: 'Cycle detector' }, { icon: '📋', label: 'Agenda' }] },
  { id: 'burying', chapter: CHAPTERS[3], title: 'Breaking the cycle', component: S12Burying, unlocks: [{ icon: '🔗', label: 'Condorcet methods' }] },
  { id: 'approval', chapter: CHAPTERS[4], title: 'Approve of many', component: S13Approval, unlocks: [{ icon: '✅', label: 'Approval' }] },
  { id: 'score', chapter: CHAPTERS[4], title: 'Stars, and the urge to exaggerate', component: S14Score, unlocks: [{ icon: '⭐', label: 'Score & STAR' }] },
  { id: 'arrow', chapter: CHAPTERS[5], title: 'Arrow’s impossible wishlist', component: S15Arrow, unlocks: [{ icon: '🏛️', label: 'Arrow checker' }] },
  { id: 'gibbard', chapter: CHAPTERS[5], title: 'Everyone can be gamed', component: S16Gibbard, unlocks: [{ icon: '📊', label: 'Manipulability meter' }] },
  { id: 'your-turn', chapter: CHAPTERS[6], title: 'Your turn', component: S17YourTurn, unlocks: [] },
]
