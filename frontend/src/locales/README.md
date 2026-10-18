# Locales

English (`en/`) is the source; every other language mirrors its message tree
key for key, and `locales.test.ts` fails on a missing key, a missing
parameter or link, or a word left untranslated. Terms are in
[`docs/glossary-fr.md`](../../../docs/glossary-fr.md).

| File | Holds |
| --- | --- |
| `app.ts` | the header, method and tactic names, shared components |
| `cast.ts` | who Riverton's candidates and spokespeople are |
| `deck.ts` | every word of the journey's slides, voices included (`src/stage`) |
| `pages.ts` | the sandbox, handbook and lab, and the components only they use |

Writing messages:

* One message per sentence or paragraph, never fragments glued together, so a
  translator can reorder words freely.
* Values go in as named parameters: `t('t05.won', { winner, votes })`.
  Plurals use `one | many` forms and a count: `t('common.voters', n)`.
* A little markup is allowed: `<strong>`, `<em>` and `<a href="/lab">`. Render
  such messages with `<RichText :text="t(…)" />`, which turns those tags into
  elements (and internal links into router links) and everything else into
  plain text. Use `<i18n-t>` only when a component has to sit inside a sentence.
* Lists of names go through `listOf()`, numbers through `n()`, so each
  language gets its own "and" and its own decimal comma.
* French: type ordinary spaces before `: ; ! ?` and inside `« »`;
  `typeset.ts` makes them non-breaking.

The API answers in the reader's language too: every request carries
`?lang=en|fr`, and `useLive` fetches again when the language changes.

To add a language: copy `fr/` to `<code>/`, translate, register it in
`src/i18n.ts` (`LOCALES` and `messages`), and teach the API its text.
