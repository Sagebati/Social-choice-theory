// The two languages of the site. English is the source; French mirrors its
// message tree key for key (see src/locales). The reader's choice is
// remembered, and a `?lang=fr` link opens the site in French.

import { computed } from 'vue'
import { createI18n } from 'vue-i18n'
import en, { type Messages } from './locales/en'
import fr from './locales/fr'

export type Locale = 'en' | 'fr'
export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
]

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends Messages {}
}

const STORAGE_KEY = 'who-really-won/locale'
const isLocale = (x: unknown): x is Locale => LOCALES.some((l) => l.id === x)

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const asked = new URLSearchParams(window.location.search).get('lang')
  if (isLocale(asked)) return asked
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    // Storage unavailable: fall back to the browser's languages.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const primary = tag.toLowerCase().split(/[-_]/)[0]
    if (isLocale(primary)) return primary
  }
  return 'en'
}

// French elides "de" and "que" before a vowel, names included: "le groupe
// d’Ana", "plutôt qu’Erik". Messages are written with the full word, since the
// name is a parameter.
export function elide(text: string): string {
  return text.replace(/\b([Dd]e|[Qq]ue) (?=[AEIOUÉÈÊÀ][a-zà-ÿ])/g, (_, word: string) => `${word.slice(0, -1)}’`)
}

function postTranslation<T>(text: T): T {
  return (typeof text === 'string' && i18n.global.locale.value === 'fr' ? elide(text) : text) as T
}

// French uses the singular for 0 and 1 ("0 électeur", "1 électeur").
// With three forms ("none | one | many") the first is for zero, as in English.
function frenchPlural(n: number, forms: number): number {
  if (forms === 3) return n === 0 ? 0 : n === 1 ? 1 : 2
  return Math.abs(n) < 2 ? 0 : 1
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { en, fr },
  pluralRules: { fr: frenchPlural },
  // Messages carry <strong>, <em> and links, rendered by RichText as elements,
  // never as HTML.
  warnHtmlMessage: false,
  postTranslation,
  missingWarn: import.meta.env.DEV,
  fallbackWarn: import.meta.env.DEV,
})

export const locale = computed(() => i18n.global.locale.value as Locale)

export function setLocale(next: Locale) {
  i18n.global.locale.value = next
  document.documentElement.lang = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Not remembered, that's all.
  }
  // A `?lang=` in the address would contradict the choice just made.
  const url = new URL(window.location.href)
  if (url.searchParams.has('lang')) {
    url.searchParams.delete('lang')
    window.history.replaceState(window.history.state, '', url)
  }
}

/** "Amira, Bruno and Camille" in the current language (British English: no serial comma). */
export const listOf = (items: string[]) =>
  new Intl.ListFormat(locale.value === 'en' ? 'en-GB' : locale.value, { type: 'conjunction' }).format(items)

if (typeof document !== 'undefined') document.documentElement.lang = locale.value
