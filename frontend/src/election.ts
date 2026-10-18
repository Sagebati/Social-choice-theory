// Small helpers over the API's data shapes.

import { i18n } from './i18n'
import type { Ballot, BallotInput, BallotKind, Election, ElectionInput, MethodId, Outcome, Tactic } from './types'

export const ALL_METHODS: MethodId[] = [
  'plurality',
  'anti_plurality',
  'two_round',
  'irv',
  'coombs',
  'borda',
  'agenda',
  'copeland',
  'minimax',
  'schulze',
  'ranked_pairs',
  'approval',
  'score',
  'star',
  'dictatorship',
]

/** A method's name in the current language. */
export const methodName = (m: MethodId) => i18n.global.t(`methods.${m}`)

export const BALLOT_KIND: Record<MethodId, BallotKind> = {
  plurality: 'choose_one',
  anti_plurality: 'veto',
  approval: 'approval',
  score: 'score',
  star: 'score',
  two_round: 'ranked',
  irv: 'ranked',
  coombs: 'ranked',
  borda: 'ranked',
  agenda: 'ranked',
  copeland: 'ranked',
  minimax: 'ranked',
  schulze: 'ranked',
  ranked_pairs: 'ranked',
  dictatorship: 'ranked',
}

export const tacticName = (t: Tactic) => i18n.global.t(`tactics.${t}`)

export const NAMES = ['Ada', 'Bea', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal']

/** One line describing a ballot, showing only what `kind` of method reads. */
export function describeBallot(names: string[], b: BallotInput, kind: BallotKind): string {
  const { t } = i18n.global
  switch (kind) {
    case 'choose_one':
      return t('ballot.votes', { name: names[b.ranking[0]] })
    case 'veto':
      return t('ballot.vetoes', { name: names[b.ranking[b.ranking.length - 1]] })
    case 'approval': {
      const approved = b.ranking.filter((c) => b.approvals?.[c])
      return approved.length
        ? t('ballot.approves', { names: approved.map((c) => names[c]).join(', ') })
        : t('ballot.approvesNobody')
    }
    case 'score':
      return b.ranking.map((c) => `${names[c]} ${b.scores?.[c] ?? '?'}`).join(' · ')
    default:
      return b.ranking.map((c) => names[c]).join(' > ')
  }
}

/** Drops the parts of each ballot `kind` ignores and merges identical ballots, so
 * big crowds become a few blocs the manipulation search can handle. */
export function simplifyFor(kind: BallotKind, e: Election): ElectionInput {
  const merged = new Map<string, BallotInput>()
  for (const b of e.ballots) {
    const rated = kind === 'approval' || kind === 'score'
    const slim: BallotInput = rated
      ? { weight: b.weight, ranking: b.ranking, approvals: b.approvals, scores: b.scores }
      : { weight: b.weight, ranking: b.ranking }
    const key =
      kind === 'approval'
        ? JSON.stringify(b.approvals)
        : kind === 'score'
          ? JSON.stringify(b.scores)
          : kind === 'choose_one'
            ? String(b.ranking[0])
            : kind === 'veto'
              ? String(b.ranking[b.ranking.length - 1])
              : JSON.stringify(b.ranking)
    const existing = merged.get(key)
    if (existing) existing.weight += b.weight
    else merged.set(key, { ...slim })
  }
  return { candidates: e.candidates, max_score: e.max_score, ballots: [...merged.values()] }
}

/** The election with candidates listed in `order` (used to set an agenda). */
export function reorder(e: ElectionInput, order: number[]): ElectionInput {
  const newIndex: number[] = []
  order.forEach((c, i) => (newIndex[c] = i))
  return {
    candidates: order.map((c) => e.candidates[c]),
    max_score: e.max_score,
    ballots: e.ballots.map((b) => ({
      weight: b.weight,
      ranking: b.ranking.map((c) => newIndex[c]),
      ...(b.approvals ? { approvals: order.map((c) => b.approvals![c]) } : {}),
      ...(b.scores ? { scores: order.map((c) => b.scores![c]) } : {}),
    })),
  }
}

/** Ballots as plain ranking inputs, so edits to rankings re-derive approvals and scores. */
export function rankingsOnly(e: { candidates: string[]; ballots: { weight: number; ranking: number[] }[] }): ElectionInput {
  return { candidates: [...e.candidates], ballots: e.ballots.map((b) => ({ weight: b.weight, ranking: [...b.ranking] })) }
}

/** The ballot an IRV-style count gives to its highest choice still in the race. */
export function activeChoice(ranking: number[], out: Set<number>): number | null {
  return ranking.find((c) => !out.has(c)) ?? null
}

/** Candidates eliminated before round `step` (0-based) of an outcome. */
export function eliminatedBefore(outcome: Outcome, step: number): Set<number> {
  const out = new Set<number>()
  outcome.rounds.slice(0, step).forEach((r) => r.eliminated.forEach((c) => out.add(c)))
  return out
}

export function winnerName(names: string[], outcome: Outcome | undefined | null): string {
  if (!outcome) return '…'
  return outcome.tied.length > 1
    ? i18n.global.t('common.tieBetween', { names: outcome.tied.map((c) => names[c]).join(', ') })
    : names[outcome.winner]
}

export function totalWeight(e: { ballots: { weight: number }[] }): number {
  return e.ballots.reduce((sum, b) => sum + b.weight, 0)
}

export function cloneBallots(b: Ballot[]): Ballot[] {
  return b.map((x) => ({ ...x, ranking: [...x.ranking], approvals: [...x.approvals], scores: [...x.scores] }))
}
