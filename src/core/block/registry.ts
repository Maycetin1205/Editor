import { ROOT_TYPE, type BlockNode } from './tree'
import type { BlockDeclaration, BlockType } from './blockType'
import {
  capability,
  conditionOf,
  hasCapability,
  type CapabilityKind,
  type CapabilityOf,
  type ContractKind,
  type RuntimeContracts,
} from './capability'
import { propertyVisible, type Property, type PropertyValue } from './property'

const registry = new Map<string, BlockType>()

export function registerBlockType(declared: BlockDeclaration): void {
  if (registry.has(declared.type)) {
    throw new Error(`Bausteintyp "${declared.type}" ist schon angemeldet.`)
  }
  registry.set(declared.type, {
    ...declared,
    properties: declared.properties ?? {},
    capabilities: declared.capabilities ?? [],
    takesChildren: declared.takesChildren ?? false,
  })
}

export function blockType(type: string): BlockType | undefined {
  return registry.get(type)
}

// The capability of a block as its values have it: one that holds only under
// a condition (the click of a Text drawn as a divider) counts while it holds.
export function capabilityOn<A extends CapabilityKind>(
  node: Pick<BlockNode, 'type' | 'values'>,
  kind: A,
): CapabilityOf<A> | undefined {
  const found = capability(registry.get(node.type), kind)
  return found !== undefined && propertyVisible(conditionOf(found), node.values) ? found : undefined
}

export function allBlockTypes(): BlockType[] {
  return Array.from(registry.values())
}

function blockTypeForTag(tagName: string): BlockType | undefined {
  const tag = tagName.toLowerCase()
  return Array.from(registry.values()).find((def) => def.tag.toLowerCase() === tag)
}

function isInstance<T>(el: Element, element: abstract new (...args: never[]) => T): el is Element & T {
  return el instanceof element
}

export function contractOf<A extends ContractKind>(el: Element, kind: A): RuntimeContracts[A] | undefined {
  const def = blockTypeForTag(el.tagName)
  if (!hasCapability(def, kind)) return undefined
  const element = def?.contracts?.[kind]
  if (element !== undefined && isInstance(el, element)) return el
  throw new Error(
    `<${el.tagName.toLowerCase()}> meldet die Faehigkeit „${kind}", nennt aber keine Klasse, die sie erfuellt.`,
  )
}

function isDeclaration(property: Property<unknown>, declared: Property<unknown>): boolean {
  return property.type === declared.type
}

export function readDeclared<V extends PropertyValue>(el: Element, declared: Property<V>): V | undefined {
  const def = blockTypeForTag(el.tagName)
  if (!def || !Object.values(def.properties).some((p) => isDeclaration(p, declared))) return undefined
  return declared.type.fromAttribute(el.getAttribute(declared.attribute), declared.default)
}

export function declaredValue<V extends PropertyValue>(node: BlockNode, declared: Property<V>): V {
  const properties = registry.get(node.type)?.properties ?? {}
  const key = Object.keys(properties).find((k) => isDeclaration(properties[k], declared))
  if (key === undefined) return declared.default
  const read = declared.type.read(node.values[key])
  return read.ok ? read.value : declared.default
}

export function readActionValue(el: Element, prop: string): string {
  const spots = capability(blockTypeForTag(el.tagName), 'actionValue')?.spots ?? []
  if (!spots.some((spot) => spot.prop === prop)) return ''
  const raw: unknown = Reflect.get(el, prop)
  return raw == null ? '' : String(raw)
}

export function mayContain(parentType: string, childType: string): boolean {
  const child = registry.get(childType)
  if (!child) return false
  if (child.allowedParent && !child.allowedParent.includes(parentType)) {
    return false
  }
  const def = registry.get(parentType)
  if (!def) return parentType === ROOT_TYPE
  if (def.allowedChildren && !def.allowedChildren.includes(childType)) return false
  return def.takesChildren
}
