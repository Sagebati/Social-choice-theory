// The Rust library, compiled to WebAssembly (crates/social-choice-wasm and
// scripts/build-wasm.mjs). It answers the same JSON the old HTTP API did.

import init, { call, type InitInput } from '../../wasm/social_choice_wasm.js'
import wasmUrl from '../../wasm/social_choice_wasm_bg.wasm?url'

let ready: Promise<unknown> | null = null

/** Loads the module once. Tests pass the module itself instead of its URL. */
export function load(source: InitInput = wasmUrl): Promise<unknown> {
  ready ??= init({ module_or_path: source }).catch((e: unknown) => {
    ready = null
    throw e
  })
  return ready
}

/**
 * Runs an endpoint (`elect`, `yee`…) on a JSON body and returns its JSON
 * answer. Throws an `Error` whose message is in `lang`, as the library wrote it.
 */
export async function run(endpoint: string, lang: string, body: string): Promise<string> {
  await load()
  return call(endpoint, lang, body)
}
