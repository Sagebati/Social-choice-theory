// Compiles crates/social-choice-wasm to WebAssembly and generates its
// JavaScript bindings in frontend/wasm (not committed). Needs the
// wasm32-unknown-unknown target and wasm-bindgen-cli at the version in
// Cargo.lock; see the README.

import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const out = fileURLToPath(new URL('../wasm', import.meta.url))
const wasm = `${root}target/wasm32-unknown-unknown/release/social_choice_wasm.wasm`

function run(command, args, hint) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error?.code === 'ENOENT') {
    console.error(`\n${command} not found. ${hint}`)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const lock = readFileSync(`${root}Cargo.lock`, 'utf8')
const version = /name = "wasm-bindgen"\nversion = "([^"]+)"/.exec(lock)?.[1] ?? '<version in Cargo.lock>'
const install = `Install it with:\n  cargo install wasm-bindgen-cli --version ${version} --locked`

run('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown', '-p', 'social-choice-wasm'], 'Install Rust from https://rustup.rs.')
run('wasm-bindgen', ['--target', 'web', '--out-dir', out, wasm], install)

const size = statSync(`${out}/social_choice_wasm_bg.wasm`).size
console.log(`frontend/wasm/social_choice_wasm_bg.wasm: ${Math.round(size / 1024)} KiB`)
