import { computed } from 'vue'
import { api } from '../api'
import { electionOf, type CastBallot } from '../cast'
import type { MethodId, Outcome, Pairwise } from '../types'
import { useLive } from './useLive'

export interface TownOptions {
  withdrawn?: number[]
  clone?: boolean
  extra?: CastBallot[]
}

export interface TownResult {
  outcome: Outcome
  /** The winner as a town candidate index (5 is Gina). */
  winner: number
  decisive: boolean
  /** Each round's tallies indexed by town candidate (null when out). */
  rounds: { title: string; tallies: (number | null)[]; eliminated: number[]; notes: string[] }[]
  spoilers: { candidate: number; winnerWithout: number }[]
  /** The outcome renumbered with town candidate indices, ready for RoundsView. */
  view: Outcome
}

/**
 * Counts Riverton's ballots under the given methods, live. The API sees only
 * the candidates still standing, so results are mapped back to the town's
 * own candidate numbers.
 */
export function useTown(ballots: () => CastBallot[], options: () => TownOptions, methods: MethodId[]) {
  const live = useLive(
    () => {
      const { election, candidates } = electionOf(ballots(), options())
      return { election, candidates }
    },
    async (q) => ({ response: await api.elect(q.election, methods), kept: q.candidates }),
  )

  const results = computed(() => {
    const d = live.data.value
    if (!d) return null
    const { response, kept } = d
    const width = Math.max(...kept) + 1
    const widen = (xs: (number | null)[]) => {
      const out: (number | null)[] = Array(Math.max(5, width)).fill(null)
      xs.forEach((x, i) => (out[kept[i]] = x))
      return out
    }
    const byMethod = {} as Record<MethodId, TownResult>
    response.results.forEach((r, k) => {
      const rounds = r.outcome.rounds.map((round) => ({
        title: round.title,
        tallies: widen(round.tallies),
        eliminated: round.eliminated.map((c) => kept[c]),
        notes: round.notes,
      }))
      byMethod[methods[k]] = {
        outcome: r.outcome,
        winner: kept[r.outcome.winner],
        decisive: !r.outcome.used_tiebreak,
        rounds,
        spoilers: r.spoilers.map((s) => ({ candidate: kept[s.candidate], winnerWithout: kept[s.winner_without] })),
        view: {
          ...r.outcome,
          winner: kept[r.outcome.winner],
          tied: r.outcome.tied.map((c) => kept[c]),
          ranking: r.outcome.ranking.map((tier) => tier.map((c) => kept[c])),
          rounds,
        },
      }
    })
    const pairwise: Pairwise = {
      ...response.pairwise,
      condorcet_winner: response.pairwise.condorcet_winner === null ? null : kept[response.pairwise.condorcet_winner],
      condorcet_loser: response.pairwise.condorcet_loser === null ? null : kept[response.pairwise.condorcet_loser],
    }
    return { byMethod, pairwise, kept, election: response.election }
  })

  return { results, loading: live.loading, error: live.error }
}
