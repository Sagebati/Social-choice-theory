import { describe, expect, it } from 'vitest'
import { parse } from './RichText'

describe('RichText', () => {
  it('turns the allowed tags into elements', () => {
    expect(parse('A <strong>bold <em>move</em></strong>, see <a href="/lab">the lab</a>.')).toEqual([
      'A ',
      {
        tag: 'strong',
        href: undefined,
        children: ['bold ', { tag: 'em', href: undefined, children: ['move'] }],
      },
      ', see ',
      { tag: 'a', href: '/lab', children: ['the lab'] },
      '.',
    ])
  })

  it('leaves everything else as text', () => {
    expect(parse('<script>x</script> and </strong> stray')).toEqual(['<script>x</script> and ', '</strong>', ' stray'])
  })
})
