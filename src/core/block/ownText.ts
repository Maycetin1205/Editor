import { defaultsOf, type PropertyValue } from './property'
import { allBlockTypes, readDeclared } from './registry'

const TEXT_PROPS = ['title', 'text', 'label'] as const

const MAX_LENGTH = 28

export function ownText(
  props: Readonly<Record<string, PropertyValue>>,
  defaults?: Readonly<Record<string, PropertyValue>>,

  covered?: ReadonlySet<string>,
): string {
  for (const key of TEXT_PROPS) {
    if (covered?.has(key)) continue
    const value = props[key]
    if (typeof value !== 'string' || value.trim() === '') continue
    if (defaults && value === defaults[key]) continue
    const text = value.trim()
    return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text
  }
  return ''
}

export function elementName(el: Element): string {
  const def = allBlockTypes().find((type) => type.tag === el.localName)
  if (!def) return el.localName
  const values: Record<string, PropertyValue> = {}
  for (const key of TEXT_PROPS) {
    const declared = def.properties[key]
    if (declared) values[key] = readDeclared(el, declared) ?? ''
  }
  return ownText(values, defaultsOf(def.properties)) || def.name
}
