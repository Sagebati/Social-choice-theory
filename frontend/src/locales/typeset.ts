// French typography: authors type ordinary spaces, readers get the
// non-breaking ones French needs, so a "?" never wraps onto a line of its own.
// The API applies the same rules to its French text.

export function typesetFrench(text: string): string {
  return text
    .replace(/ ([;!?])/g, ' $1')
    .replace(/ :/g, ' :')
    .replace(/« /g, '« ')
    .replace(/ »/g, ' »')
}

type Tree = string | Tree[] | { [key: string]: Tree }

/** Applies `fix` to every string in a message tree, keeping its shape. */
export function mapMessages<T>(tree: T, fix: (s: string) => string): T {
  const walk = (node: Tree): Tree =>
    typeof node === 'string'
      ? fix(node)
      : Array.isArray(node)
        ? node.map(walk)
        : Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]))
  return walk(tree as Tree) as T
}
