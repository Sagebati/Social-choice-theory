import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useLive } from './useLive'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('useLive', () => {
  it('keeps one request in flight and finishes on the latest input', async () => {
    const calls: number[] = []
    const pending: (() => void)[] = []
    const input = ref(1)
    const live = useLive(
      () => input.value,
      (n: number) => {
        calls.push(n)
        return new Promise<number>((resolve) => pending.push(() => resolve(n * 10)))
      },
    )
    // A burst of changes while the first request is still running.
    for (const n of [2, 3, 4]) {
      input.value = n
      await nextTick()
    }
    expect(calls).toEqual([1])
    pending.shift()!()
    await tick()
    // The stale answer for 1 is dropped; only the latest input is fetched next.
    expect(live.data.value).toBeNull()
    expect(calls).toEqual([1, 4])
    pending.shift()!()
    await tick()
    expect(live.data.value).toBe(40)
  })

  it('pauses on null and reports errors', async () => {
    const input = ref<number | null>(null)
    const live = useLive(
      () => input.value,
      async () => {
        throw new Error('boom')
      },
    )
    await tick()
    expect(live.loading.value).toBe(false)
    input.value = 1
    await nextTick()
    await tick()
    expect(live.error.value).toBe('boom')
  })

  it('reports a failure at once, even with a newer input queued, and clears it on the next answer', async () => {
    const pending: ((ok: boolean) => void)[] = []
    const input = ref(1)
    const live = useLive(
      () => input.value,
      (n: number) =>
        new Promise<number>((resolve, reject) => pending.push((ok) => (ok ? resolve(n) : reject(new Error('down'))))),
    )
    input.value = 2
    await nextTick()
    pending.shift()!(false)
    await tick()
    expect(live.error.value).toBe('down')
    expect(live.loading.value).toBe(true)
    pending.shift()!(true)
    await tick()
    expect(live.error.value).toBeNull()
    expect(live.data.value).toBe(2)
  })
})
