import { api } from '../api'
import type { ElectionInput, MethodId, SpatialModel, SpatialResponse } from '../types'
import { useLive } from './useLive'

type Methods = MethodId[] | (() => MethodId[])
const list = (methods: Methods) => (typeof methods === 'function' ? methods() : methods)

/** Live results for a spatial model under the given methods. */
export function useSpatial(model: () => SpatialModel | null, methods: Methods) {
  return useLive(
    () => {
      const m = model()
      return m && { model: m, methods: list(methods) }
    },
    (q) => api.spatial(q.model, q.methods),
  )
}

/** Live results for a ballot profile under the given methods. */
export function useElect(election: () => ElectionInput | null, methods: Methods) {
  return useLive(
    () => {
      const e = election()
      return e && { election: e, methods: list(methods) }
    },
    (q) => api.elect(q.election, q.methods),
  )
}

/** Live Yee diagram. Only candidate positions matter, so dragging crowds is free. */
export function useYee(model: () => SpatialModel | null, method: () => MethodId, resolution = 28) {
  return useLive(
    () => {
      const m = model()
      return m && { model: { ...m, crowds: [], voters: [] }, method: method() }
    },
    (q) => api.yee(q.model, q.method, resolution),
  )
}

export function resultFor(data: SpatialResponse | null, method: MethodId) {
  return data?.results.find((r) => r.method === method) ?? null
}

/** Each voter's favourite on the ballot they cast. */
export function favourites(data: SpatialResponse | null, method: MethodId): (number | null)[] {
  return resultFor(data, method)?.votes.map((v) => v.ballot.ranking[0]) ?? []
}

/** Which voters cast a strategic (changed) ballot. */
export function changed(data: SpatialResponse | null, method: MethodId): boolean[] {
  return resultFor(data, method)?.votes.map((v) => v.changed) ?? []
}

export function model(partial: Partial<SpatialModel> & Pick<SpatialModel, 'candidates'>): SpatialModel {
  return { crowds: [], voters: [], approval_radius: null, max_score: 5, strategic: 0, ...partial }
}
