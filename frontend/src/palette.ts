// Candidate i always wears categorical slot i (see styles.css).
export const color = (i: number) => `var(--c${i % 8})`

// Ink or white for text drawn on top of a candidate colour, by its lightness.
export const onColor = (i: number) => ([2, 3, 4].includes(i % 8) ? '#0b0b0b' : '#ffffff')

export const initial = (name: string) => name.slice(0, 1).toUpperCase()
