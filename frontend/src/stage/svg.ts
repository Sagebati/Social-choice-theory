// Small helpers for drawing the stage by hand.

const NS = 'http://www.w3.org/2000/svg'

export function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  parent?.appendChild(e)
  return e
}

export function text(
  x: number,
  y: number,
  value: string,
  cls: string,
  parent: Element,
  anchor: 'start' | 'middle' | 'end' = 'middle',
): SVGTextElement {
  const t = el('text', { x, y, 'text-anchor': anchor, class: cls }, parent)
  t.textContent = value
  return t
}

/** A rough width for text in the stage's font, enough to size pills and bubbles. */
export const textWidth = (s: string, size: number) => s.length * size * 0.56

/** Splits `s` into lines of at most about `max` characters, at spaces. */
export function wrap(s: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of s.split(' ')) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines
}

/** Makes an SVG element act as a button: focusable, with Enter and Space. */
export function asButton(e: SVGElement, label: string, onClick: () => void) {
  e.setAttribute('role', 'button')
  e.setAttribute('tabindex', '0')
  e.setAttribute('aria-label', label)
  e.addEventListener('click', onClick)
  e.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key
    if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      onClick()
    }
  })
}
