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
import { locale, type Locale } from './i18n'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

// The API writes its explanations (round notes, method descriptions, errors)
// in the language asked for.
async function request<T>(path: string, body?: unknown, lang: Locale = locale.value): Promise<T> {
  const init: RequestInit | undefined =
    body === undefined
      ? undefined
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
  const response = await fetch(`${BASE}/api${path}?lang=${lang}`, init)
  const data = await response.json().catch(() => ({ error: response.statusText }))
  if (!response.ok) throw new Error((data as { error?: string }).error ?? response.statusText)
  return data as T
}

// The catalogue never changes while the page is open, so fetch it once per language.
const once = <T>(path: string) => {
  const cached = new Map<Locale, Promise<T>>()
  return () => {
    const lang = locale.value
    let hit = cached.get(lang)
    if (!hit) {
      hit = request<T>(path, undefined, lang).catch((e) => {
        cached.delete(lang)
        throw e
      })
      cached.set(lang, hit)
    }
    return hit
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
