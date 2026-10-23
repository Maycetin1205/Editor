import { helperFieldsOnly } from '../../../core/block/binding'
import type { BlockType } from '../../../core/block/blockType'
import { bindingProp, capability, hasCapability } from '../../../core/block/capability'
import { gridMetricsOf } from '../../../core/block/grid'
import { columnsOf, isGridArea, slotOn } from '../../../core/block/gridArea'
import { newSubtree } from '../../../core/block/newBlock'
import { writeValue, type PagesEntry } from '../../../core/block/pages'
import type { PropertyValue } from '../../../core/block/property'
import { blockType, mayContain } from '../../../core/block/registry'
import { SOURCE_PROP } from '../../../core/block/sourceProperty'
import { ROOT_ID, type BlockNode, type MaskTree } from '../../../core/block/tree'
import { declaredProperty, subtreeIds } from '../../../core/block/treeOps'
import type { ActionChains } from '../../../core/data/steps/steps'
import { droppedKeys, withoutColumnsPointer } from '../columnCleanup'

export function blockAdded(
  tree: MaskTree,
  type: string,
  parentId: string,
  index: number | undefined,
  rows: number | null,
): { tree: MaskTree; node: BlockNode } | null {
  const parent = tree[parentId]
  if (!parent || !mayContain(parent.type, type)) return null
  const spec = gridMetricsOf(blockType(type))
  const slot = isGridArea(parent)
    ? slotOn(tree, parent.id, spec.startWidth, spec.startHeight, rows)
    : undefined
  if (slot === null) return null
  const { nodes, rootId } = newSubtree(type)
  const node = nodes[rootId]
  node.parentId = parent.id

  if (slot) {
    const w = Math.min(spec.startWidth, columnsOf(tree, parent.id))
    node.values = { ...node.values, gridX: slot.x, gridY: slot.y, gridW: w, gridH: spec.startHeight }
  }
  const childIds = [...parent.childIds]
  const at = index === undefined
    ? childIds.length
    : Math.max(0, Math.min(index, childIds.length))
  childIds.splice(at, 0, node.id)
  return {
    tree: { ...tree, ...nodes, [parent.id]: { ...parent, childIds } },
    node,
  }
}

export function blockRemoved(tree: MaskTree, id: string): { tree: MaskTree; removed: ReadonlySet<string> } | null {
  const node = tree[id]
  if (!node || id === ROOT_ID) return null
  const removed = new Set(subtreeIds(tree, id))
  const next: MaskTree = {}
  for (const [key, value] of Object.entries(tree)) {
    if (!removed.has(key)) next[key] = value
  }
  if (node.parentId && next[node.parentId]) {
    const parent = next[node.parentId]
    next[node.parentId] = { ...parent, childIds: parent.childIds.filter((c) => c !== id) }
  }
  return { tree: next, removed }
}

export function inSubtree(tree: MaskTree, ancestorId: string, id: string): boolean {
  let cur: string | null | undefined = id
  while (cur) {
    if (cur === ancestorId) return true
    cur = tree[cur]?.parentId
  }
  return false
}

type PropertyOutcome =
  | { kind: 'changed'; tree: MaskTree }
  | { kind: 'same' }
  | { kind: 'refused' }

export function propertyUpdated(
  tree: MaskTree,
  pages: readonly PagesEntry[],
  id: string,
  name: string,
  raw: unknown,
): PropertyOutcome {
  const node = tree[id]
  if (!node) return { kind: 'refused' }
  const declared = declaredProperty(node, name)
  if (declared === undefined) return { kind: 'refused' }
  const def = blockType(node.type)

  const read = declared.type.read(writeValue(def, pages, id, name, raw))
  if (!read.ok) return { kind: 'refused' }
  const value = read.value

  if (Object.is(node.values[name], value)) return { kind: 'same' }
  const properties = def?.properties ?? {}
  const dependents = Object.entries(properties).flatMap(([key, other]) => {
    if (other.preset?.by === name) return [[key, other.default]]
    if (other.sourceProp !== name) return []
    const plain = other.plainNameProp
    return plain === undefined || properties[plain] === undefined
      ? [[key, other.default]]
      : [[key, other.default], [plain, properties[plain].default]]
  })
  const list = capability(def, 'list')?.binding
  const entries = list?.sourceProp === name ? node.values[list.prop] : undefined
  if (list && Array.isArray(entries) && entries.length > 0) dependents.push([list.prop, []])
  if (name === SOURCE_PROP && def && hasCapability(def, 'source')) dependents.push(...ownFieldsDropped(def, node.values))
  const next: MaskTree = {
    ...tree,
    [id]: { ...node, values: { ...node.values, ...Object.fromEntries(dependents), [name]: value } },
  }

  const cleaned = withoutColumnsPointer(
    next,
    id,
    droppedKeys(def, name, node.values[name], value),
  )
  return { kind: 'changed', tree: cleaned.tree }
}

function ownFieldsDropped(def: BlockType, values: Readonly<Record<string, PropertyValue>>): [string, PropertyValue][] {
  const dropped: [string, PropertyValue][] = []
  for (const spot of capability(def, 'bindable')?.spots ?? []) {
    const key = bindingProp(spot.prop)
    const value = values[key]
    if (typeof value === 'string' && helperFieldsOnly(value) !== value) dropped.push([key, helperFieldsOnly(value)])
  }
  const list = capability(def, 'list')?.binding
  if (!list || list.sourceProp !== undefined || list.fieldless === true) return dropped
  const entries = list.entries(values[list.prop])
  const kept = entries.map((entry) => {
    const field = list.fieldOf(entry)
    const left = helperFieldsOnly(field)
    return left === field ? entry : list.withPickedField(entry, left, list.titleOf(entry), undefined)
  })
  if (kept.some((entry, i) => entry !== entries[i])) dropped.push([list.prop, kept as PropertyValue])
  return dropped
}

export function eventsUpdated(tree: MaskTree, id: string, events: ActionChains): MaskTree | null {
  const node = tree[id]
  if (!node || id === ROOT_ID) return null
  const clean: ActionChains = {}
  for (const [key, steps] of Object.entries(events)) {
    if (steps.length > 0) clean[key] = steps
  }
  const next: BlockNode = { ...node }
  if (Object.keys(clean).length > 0) next.chains = clean
  else delete next.chains
  return { ...tree, [id]: next }
}
