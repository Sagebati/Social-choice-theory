import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import { parse } from '../components/RichText'
import en from './en'
import fr from './fr'
import { typesetFrench } from './typeset'

type Tree = string | Tree[] | { [key: string]: Tree }

function flatten(tree: Tree, prefix = '', out = new Map<string, string>()): Map<string, string> {
  if (typeof tree === 'string') out.set(prefix, tree)
  else Object.entries(tree).forEach(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k, out))
  return out
}

const english = flatten(en as Tree)
const french = flatten(fr as Tree)
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const links = (s: string) => [...s.matchAll(/<a href="([^"]*)">/g)].map((m) => m[1]).sort()
const forms = (s: string) => s.split(' | ').length

describe('French messages', () => {
  it('have exactly the English keys', () => {
    expect([...french.keys()].filter((k) => !english.has(k))).toEqual([])
    expect([...english.keys()].filter((k) => !french.has(k))).toEqual([])
  })

  it('use the same parameters, links and plural forms', () => {
    for (const [key, source] of english) {
      const target = french.get(key) ?? ''
      expect(placeholders(target), key).toEqual(placeholders(source))
      expect(links(target), key).toEqual(links(source))
      expect(forms(target), key).toBe(forms(source))
    }
  })

  it('are actually translated', () => {
    // Names, symbols and words French borrows as they are.
    const same = [...english].filter(([key, s]) => french.get(key) === s && /[a-z]{4,}/.test(s))
    const allowed = /^(✓ Condorcet|STAR|Minimax|Coombs|Copeland|Schulze|Duels|Points|Push-over|Riverton|auto|points|\{.*)/
    expect(same.filter(([, s]) => !allowed.test(s)).map(([k]) => k)).toEqual([])
  })
})

describe('every message', () => {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, fr }, missingWarn: false, warnHtmlMessage: false })
  const { t } = i18n.global

  it('compiles, and its markup is balanced', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const [key, source] of lang === 'en' ? english : french) {
        const params = Object.fromEntries(placeholders(source).map((p) => [p, `«${p}»`]))
        const text = t(key, params, { locale: lang, plural: 2 })
        expect(text, `${lang}:${key}`).not.toMatch(/\{\w+\}/)
        const stray = (nodes: ReturnType<typeof parse>): string[] =>
          nodes.flatMap((n) => (typeof n === 'string' ? (/<\/?(strong|em|a)\b/.test(n) ? [n] : []) : stray(n.children)))
        expect(stray(parse(text)), `${lang}:${key}`).toEqual([])
      }
    }
  })
})

describe('the source code', () => {
  it('only asks for keys that exist', () => {
    const sources = import.meta.glob<string>(['../**/*.vue', '../**/*.ts', '!./**', '!../**/*.test.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    expect(Object.keys(sources).length).toBeGreaterThan(40)
    const missing: string[] = []
    for (const [file, source] of Object.entries(sources)) {
      for (const m of source.matchAll(/\$?\bt\(\s*'([\w.]+)'/g)) {
        if (!english.has(m[1]) && ![...english.keys()].some((k) => k.startsWith(`${m[1]}.`))) missing.push(`${file}: ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })
})

describe('French typography', () => {
  it('keeps high punctuation and guillemets on the line', () => {
    expect(typesetFrench('Qui gagne ? Lui : « Erik » ; enfin !')).toBe(
      'Qui gagne ? Lui : « Erik » ; enfin !',
    )
    expect(typesetFrench('https://example.org, 16–14')).toBe('https://example.org, 16–14')
  })
})
