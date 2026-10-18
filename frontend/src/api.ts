import type {
  ArrowReport,
  CounterexampleResponse,
  CriterionId,
  CriterionInfo,
  Election,
  ElectionInput,
  ElectResponse,
  ManipulateResponse,
  Manipulability,
  MethodId,
  MethodInfo,
  RuleId,
  Scenario,
  SpatialModel,
  SpatialResponse,
  YeeResponse,
} from './types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function request<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit | undefined =
    body === undefined
      ? undefined
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
  const response = await fetch(`${BASE}/api${path}`, init)
  const data = await response.json().catch(() => ({ error: response.statusText }))
  if (!response.ok) throw new Error((data as { error?: string }).error ?? response.statusText)
  return data as T
}

// The catalogue never changes while the page is open, so fetch it once.
const once = <T>(path: string) => {
  let cached: Promise<T> | null = null
  return () => {
    cached ??= request<T>(path).catch((e) => {
      cached = null
      throw e
    })
    return cached
  }
}

export const api = {
  methods: once<MethodInfo[]>('/methods'),
  criteria: once<CriterionInfo[]>('/criteria'),
  scenarios: once<Scenario[]>('/scenarios'),
  elect: (election: ElectionInput, methods: MethodId[]) => request<ElectResponse>('/elect', { election, methods }),
  spatial: (model: SpatialModel, methods: MethodId[]) => request<SpatialResponse>('/spatial', { model, methods }),
  yee: (model: SpatialModel, method: MethodId, resolution = 28) =>
    request<YeeResponse>('/yee', { model: { ...model, crowds: [], voters: [] }, method, resolution }),
  manipulate: (election: ElectionInput, method: MethodId, limit = 8) =>
    request<ManipulateResponse>('/manipulate', { election, method, limit }),
  manipulability: (methods: MethodId[], candidates = 3, samples = 120) =>
    request<Manipulability[]>('/manipulability', { methods, candidates, samples }),
  counterexample: (method: MethodId, criterion: CriterionId) =>
    request<CounterexampleResponse>('/counterexample', { method, criterion }),
  arrow: (rule: RuleId, voters = 3) => request<ArrowReport>('/arrow', { rule, voters }),
  random: (candidates: number, groups: number, seed: number) =>
    request<Election>('/random', { candidates, groups, seed }),
}
