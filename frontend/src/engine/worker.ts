// A Web Worker that runs the library, so long computations never hold up
// dragging or animations on the page.

import { run } from './core'
import type { Reply, Request } from './index'

const post = (reply: Reply) => self.postMessage(reply)

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  try {
    post({ id: data.id, json: await run(data.endpoint, data.lang, data.body) })
  } catch (e) {
    // A trap (a Rust panic) leaves the instance unusable: ask for a fresh worker.
    post({ id: data.id, error: e instanceof Error ? e.message : String(e), fatal: e instanceof WebAssembly.RuntimeError })
  }
}
