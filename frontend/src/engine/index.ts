// Runs the library off the main thread. Quick calls (the catalogue, counting
// an election, the opinion map) and slow ones (Yee diagrams, searches, sweeps)
// get a worker each, so a long search never delays the live results of a drag.

export interface Request {
  id: number
  endpoint: string
  lang: string
  /** JSON, or empty for the catalogue. Sent as text, since Vue's reactive proxies can't be cloned. */
  body: string
}

export type Reply = { id: number; json: string } | { id: number; error: string; fatal: boolean }

const SLOW = new Set(['yee', 'manipulate', 'manipulability', 'counterexample', 'arrow'])

type Waiting = { resolve: (json: string) => void; reject: (error: Error) => void }

class Lane {
  private worker: Worker | null = null
  private waiting = new Map<number, Waiting>()

  send(request: Request): Promise<string> {
    const worker = (this.worker ??= this.start())
    return new Promise((resolve, reject) => {
      this.waiting.set(request.id, { resolve, reject })
      worker.postMessage(request)
    })
  }

  private start(): Worker {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }: MessageEvent<Reply>) => {
      const waiting = this.waiting.get(data.id)
      this.waiting.delete(data.id)
      if ('json' in data) return waiting?.resolve(data.json)
      waiting?.reject(new Error(data.error))
      if (data.fatal) this.stop(worker, data.error)
    }
    // The worker itself failed to load: fail everything it was asked.
    worker.onerror = (event) => {
      event.preventDefault()
      this.stop(worker, event.message || 'the computation engine failed to start')
    }
    return worker
  }

  private stop(worker: Worker, message: string) {
    worker.terminate()
    if (this.worker === worker) this.worker = null
    for (const { reject } of this.waiting.values()) reject(new Error(message))
    this.waiting.clear()
  }
}

const lanes = { quick: new Lane(), slow: new Lane() }
let next = 0

/** Runs an endpoint in a worker. Rejects with the library's message, in `lang`. */
export async function compute<T>(endpoint: string, lang: string, body?: unknown): Promise<T> {
  const lane = SLOW.has(endpoint) ? lanes.slow : lanes.quick
  return JSON.parse(await lane.send({ id: next++, endpoint, lang, body: body === undefined ? '' : JSON.stringify(body) })) as T
}
