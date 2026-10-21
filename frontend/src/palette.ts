// Candidate i always wears categorical slot i (see styles.css).
export const color = (i: number) => `var(--c${i % 8})`

// Ink or white for text drawn on top of a candidate colour, whichever contrasts more in this theme.
export const onColor = (i: number) => `var(--on-c${i % 8})`

/** A candidate's initial, or its first two letters when another of `names` starts the same way. */
export function initial(name: string, names: readonly string[] = []) {
  const first = (s: string) => s.slice(0, 1).toUpperCase()
  return names.some((other) => other !== name && first(other) === first(name)) ? first(name) + name.slice(1, 2) : first(name)
}
