import { beforeAll, describe, expect, it } from 'vitest'
import type { ElectResponse, YeeResponse } from '../types'
import { load, run } from './core'

const election = {
  candidates: ['Ada', 'Bea', 'Cal'],
  ballots: [
    { weight: 40, ranking: [0, 1, 2] },
    { weight: 35, ranking: [1, 2, 0] },
    { weight: 25, ranking: [2, 1, 0] },
  ],
}

const ask = async <T>(endpoint: string, lang: string, body?: unknown) =>
  JSON.parse(await run(endpoint, lang, body === undefined ? '' : JSON.stringify(body))) as T

// The built module itself (npm run wasm), read from disk: Node can't fetch it.
// Node's fs, without @types/node for one call.
type Fs = { readFileSync(path: URL): Uint8Array<ArrayBuffer> }
const fs = (globalThis as unknown as { process: { getBuiltinModule(id: string): Fs } }).process.getBuiltinModule('node:fs')
beforeAll(() => load(fs.readFileSync(new URL('../../wasm/social_choice_wasm_bg.wasm', import.meta.url))))

describe('the WebAssembly library', () => {
  it('counts an election', async () => {
    const result = await ask<ElectResponse>('elect', 'en', { election, methods: ['plurality', 'irv'] })
    expect(result.results.map((r) => r.outcome.winner)).toEqual([0, 1])
    expect(result.pairwise.condorcet_winner).toBe(1)
  })

  it('answers in French, with French typography', async () => {
    const result = await ask<ElectResponse>('elect', 'fr', { election, methods: ['two_round'] })
    expect(result.results[0].outcome.rounds[1].notes[0]).toBe('Bea remporte le second tour face à Ada.')
    const criteria = await ask<{ question: string }[]>('criteria', 'fr')
    expect(criteria[0].question.endsWith('toujours ?')).toBe(true)
  })

  it('runs the heavy calls', async () => {
    const model = { candidates: [{ name: 'Ada', x: 0.2, y: 0.5 }, { name: 'Bea', x: 0.8, y: 0.5 }] }
    const yee = await ask<YeeResponse>('yee', 'en', { model, method: 'plurality', resolution: 4 })
    expect(yee.cells).toEqual([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1])
    const rates = await ask<{ manipulable: number }[]>('manipulability', 'en', { methods: ['dictatorship'], samples: 20 })
    expect(rates[0].manipulable).toBe(0)
  })

  it('throws errors in the language asked for', async () => {
    const bad = { election: { candidates: ['A', 'B'], ballots: [{ ranking: [0, 0] }] } }
    await expect(run('elect', 'en', JSON.stringify(bad))).rejects.toThrow('exactly once')
    await expect(run('elect', 'fr', JSON.stringify(bad))).rejects.toThrow(
      'bulletin 0 : le classement doit citer chaque candidat exactement une fois',
    )
    await expect(run('arrow', 'fr', '{"rule": "borda", "voters": 9}')).rejects.toThrow('voters doit aller de 2 à 4')
  })
})
