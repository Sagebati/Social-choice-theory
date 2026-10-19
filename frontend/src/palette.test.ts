import { describe, expect, it } from 'vitest'
import { CANDIDATES } from './cast'
import { initial } from './palette'

describe('initial', () => {
  it('takes two letters only where two candidates share an initial', () => {
    const names = CANDIDATES.map((c) => c.name)
    expect(names.map((n) => initial(n, names))).toEqual(['C', 'Ma', 'Me', 'P', 'D'])
    expect(['ann', 'bob'].map((n) => initial(n, ['ann', 'bob']))).toEqual(['A', 'B'])
  })
})
