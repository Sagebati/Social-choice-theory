// Mirrors of the JSON the Rust API produces (see backend/src/api.rs).

export type MethodId =
  | 'plurality'
  | 'anti_plurality'
  | 'two_round'
  | 'irv'
  | 'coombs'
  | 'borda'
  | 'agenda'
  | 'copeland'
  | 'minimax'
  | 'schulze'
  | 'ranked_pairs'
  | 'approval'
  | 'score'
  | 'star'
  | 'dictatorship'

export type CriterionId =
  | 'majority'
  | 'condorcet_winner'
  | 'condorcet_loser'
  | 'pareto'
  | 'monotonicity'
  | 'participation'
  | 'iia'
  | 'clones'

export type BallotKind = 'choose_one' | 'veto' | 'ranked' | 'approval' | 'score'
export type Family = 'positional' | 'runoff' | 'condorcet' | 'cardinal' | 'degenerate'
export type Tactic =
  | 'compromising'
  | 'burying'
  | 'compromising_and_burying'
  | 'push_over'
  | 'bullet_voting'
  | 'exaggeration'
export type RuleId = MethodId | 'pairwise_majority'

export interface Ballot {
  weight: number
  ranking: number[]
  approvals: boolean[]
  scores: number[]
}

/** What the API accepts: approvals and scores are derived from the ranking when left out. */
export interface BallotInput {
  weight: number
  ranking: number[]
  approvals?: boolean[]
  scores?: number[]
}

export interface Election {
  candidates: string[]
  max_score: number
  ballots: Ballot[]
}

export interface ElectionInput {
  candidates: string[]
  max_score?: number
  ballots: BallotInput[]
}

export interface Round {
  title: string
  tallies: (number | null)[]
  eliminated: number[]
  notes: string[]
}

export interface Outcome {
  method: MethodId
  winner: number
  tied: number[]
  ranking: number[][]
  rounds: Round[]
  used_tiebreak: boolean
}

export interface Spoiler {
  candidate: number
  winner_without: number
}

export interface Pairwise {
  matrix: number[][]
  condorcet_winner: number | null
  condorcet_loser: number | null
  smith_set: number[]
  cycle: number[] | null
}

export interface MethodResult {
  outcome: Outcome
  spoilers: Spoiler[]
}

export interface ElectResponse {
  election: Election
  pairwise: Pairwise
  results: MethodResult[]
}

export interface Point {
  x: number
  y: number
}

export interface Crowd {
  x: number
  y: number
  spread: number
  count: number
}

export interface SpatialCandidate {
  name: string
  x: number
  y: number
}

export interface SpatialModel {
  candidates: SpatialCandidate[]
  crowds: Crowd[]
  voters: Point[]
  approval_radius: number | null
  max_score: number
  strategic: number
}

export interface SpatialVote {
  ballot: Ballot
  strategic: boolean
  changed: boolean
}

export interface SpatialMethodResult {
  method: MethodId
  outcome: Outcome
  frontrunners: number[]
  votes: SpatialVote[]
  spoilers: Spoiler[]
  election: Election
}

export interface SpatialResponse {
  voters: Point[]
  honest: Election
  pairwise: Pairwise
  results: SpatialMethodResult[]
}

export interface YeeResponse {
  method: MethodId
  resolution: number
  cells: number[]
}

export interface Manipulation {
  group: number
  voters: number
  sincere: Ballot
  strategic: Ballot
  honest_winner: number
  new_winner: number
  tactic: Tactic
  explanation: string
  election: Election
}

export interface ManipulateResponse {
  honest: Outcome
  manipulations: Manipulation[]
  spoilers: Spoiler[]
}

export interface Manipulability {
  method: MethodId
  candidates: number
  samples: number
  manipulable: number
  rate: number
}

export interface Counterexample {
  criterion: CriterionId
  method: MethodId
  before: Election
  before_outcome: Outcome
  after: Election | null
  after_outcome: Outcome | null
  explanation: string
}

export interface CounterexampleResponse {
  satisfied: boolean
  counterexample: Counterexample | null
}

export interface ArrowProfile {
  ballots: number[][]
  social: number[][] | null
}

export interface ArrowReport {
  rule: RuleId
  candidates: string[]
  voters: number
  profiles: number
  transitivity: { profile: ArrowProfile; cycle: number[] } | null
  pareto: { profile: ArrowProfile; better: number; worse: number } | null
  iia: { a: number; b: number; first: ArrowProfile; second: ArrowProfile; changed_voters: number[] } | null
  dictator: number | null
}

export interface Rig {
  title: string
  how: string
  scenario: string | null
}

export interface MethodInfo {
  id: MethodId
  name: string
  family: Family
  ballot: BallotKind
  summary: string
  how_it_works: string
  used_in: string
  rigging: Rig[]
  criteria: { criterion: CriterionId; satisfied: boolean }[]
}

export interface CriterionInfo {
  id: CriterionId
  name: string
  question: string
  description: string
}

export interface Scenario {
  id: string
  title: string
  story: string
  methods: MethodId[]
  election: Election
}
