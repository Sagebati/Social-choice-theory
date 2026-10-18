import { ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue'

export interface Live<O> {
  data: ShallowRef<O | null>
  error: Ref<string | null>
  loading: Ref<boolean>
}

/**
 * Keeps `data` in sync with `fetcher(input())` while the input changes, e.g. while
 * a candidate is being dragged. At most one request is in flight; changes that
 * arrive meanwhile are coalesced into a single follow-up request with the latest
 * input, so the display never lags behind by more than one round trip and never
 * shows a stale answer after a newer one.
 *
 * Return `null` from `input` to pause.
 */
export function useLive<I, O>(input: () => I | null, fetcher: (input: I) => Promise<O>): Live<O> {
  const data = shallowRef<O | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  let inFlight = false
  let pending: string | null = null

  async function run(key: string) {
    if (inFlight) {
      pending = key
      return
    }
    inFlight = true
    loading.value = true
    try {
      const result = await fetcher(JSON.parse(key) as I)
      // A newer input is already queued: skip this answer and fetch that one.
      if (pending === null) {
        data.value = result
        error.value = null
      }
    } catch (e) {
      if (pending === null) error.value = e instanceof Error ? e.message : String(e)
    } finally {
      inFlight = false
      loading.value = false
      if (pending !== null) {
        const next = pending
        pending = null
        void run(next)
      }
    }
  }

  watch(
    () => {
      const value = input()
      return value === null ? null : JSON.stringify(value)
    },
    (key) => {
      if (key !== null) void run(key)
    },
    { immediate: true },
  )

  return { data, error, loading }
}
