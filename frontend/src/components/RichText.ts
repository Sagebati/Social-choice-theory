import { defineComponent, h, type VNodeChild } from 'vue'
import { RouterLink } from 'vue-router'

// A translated message with a little markup: <strong>, <em> and <a href="…">
// (paths starting with "/" become router links). Everything else, including
// any parameter values, renders as plain text, so no message ever reaches the
// page as HTML.

const TAG = /<(\/?)(strong|em|a)(?:\s+href="([^"]*)")?\s*>/g

interface Element {
  tag: 'strong' | 'em' | 'a' | null
  href?: string
  children: (string | Element)[]
}

export function parse(text: string): (string | Element)[] {
  const root: Element = { tag: null, children: [] }
  const stack: Element[] = [root]
  let last = 0
  for (const match of text.matchAll(TAG)) {
    const [whole, closing, tag, href] = match
    const top = stack[stack.length - 1]
    if (match.index > last) top.children.push(text.slice(last, match.index))
    last = match.index + whole.length
    if (!closing) {
      const element: Element = { tag: tag as Element['tag'], href, children: [] }
      top.children.push(element)
      stack.push(element)
    } else if (stack.length > 1 && top.tag === tag) {
      stack.pop()
    } else {
      top.children.push(whole)
    }
  }
  if (last < text.length) stack[stack.length - 1].children.push(text.slice(last))
  return root.children
}

function render(nodes: (string | Element)[]): VNodeChild[] {
  return nodes.map((node) => {
    if (typeof node === 'string') return node
    const children = render(node.children)
    if (node.tag !== 'a') return h(node.tag!, children)
    const href = node.href ?? ''
    if (href.startsWith('/')) return h(RouterLink, { to: href }, () => children)
    return h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, children)
  })
}

export default defineComponent({
  name: 'RichText',
  props: {
    text: { type: String, required: true },
    tag: { type: String, default: 'span' },
  },
  setup(props) {
    return () => h(props.tag, render(parse(props.text)))
  },
})
