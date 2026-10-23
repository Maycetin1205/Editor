import type { PropertyMap, PropertyValue } from '../../core/block/property'
import { ROOT_ID, ROOT_TYPE, type BlockNode, type MaskTree } from '../../core/block/tree'
import { blockType, mayContain } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import { DOCUMENT_FRAME_PROP } from '../../core/block/documentFrame'
import { EXPORT_TARGET_PROP } from '../../core/block/exportTarget'
import { MASK_NAME_PROP } from '../../core/block/maskName'
import { chainsClean } from '../../core/data/steps/chains'
import { isUnread } from '../../core/unread'
import { treeFromRoot } from './treeFromRoot'
import { valuesClean } from '../../core/block/treeOps'
import type { Leftover, ValueLeft } from './leftover'

const ROOT_KEYS = [MASK_NAME_PROP, DOCUMENT_FRAME_PROP, EXPORT_TARGET_PROP]

export type Missed =
  | { kind: 'type'; id: string; type: string }
  | { kind: 'place'; id: string; type: string; parentType: string }
  | { kind: 'lost'; id: string }
  | { kind: 'chain'; id: string; type: string; event: string }

export interface TreeRead {
  tree: MaskTree
  selectedId: string | null
  leftover: Pick<Leftover, 'nodes' | 'places' | 'values' | 'chains'>
  missed: Missed[]
}

function wellFormed(node: unknown, id: string): node is BlockNode {
  return isUnread<BlockNode>(node) && node.id === id && typeof node.type === 'string'
    && isUnread<BlockNode['values']>(node.values) && Array.isArray(node.childIds)
    && node.childIds.every((childId): childId is string => typeof childId === 'string')
    && (node.parentId === null || typeof node.parentId === 'string')
}

function valuesLeft(
  raw: Readonly<Record<string, unknown>>,
  kept: Readonly<Record<string, PropertyValue>>,
  properties: PropertyMap | null,
): Record<string, ValueLeft> | null {
  const left: Record<string, ValueLeft> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (properties === null) {
      if (!Object.hasOwn(kept, key)) left[key] = { raw: value }
    } else if (!Object.hasOwn(properties, key)) {
      left[key] = { raw: value }
    } else if (!properties[key].type.read(value).ok) {
      left[key] = { raw: value, readAs: kept[key] }
    }
  }
  return Object.keys(left).length > 0 ? left : null
}

function chainsLeft(raw: unknown, kept: BlockNode['chains']): Record<string, unknown> | null {
  if (!isUnread<Record<string, unknown>>(raw)) return null
  const left: Record<string, unknown> = {}
  for (const [event, chain] of Object.entries(raw)) {
    if (Array.isArray(chain) && chain.length > 0 && !kept?.[event]) left[event] = chain
  }
  return Object.keys(left).length > 0 ? left : null
}

export function checkTreeState(raw: {
  tree?: unknown
  selectedId?: unknown
}): TreeRead | null {
  if (!isUnread<MaskTree>(raw.tree)) return null
  const source: Readonly<Record<string, unknown>> = raw.tree
  const read: MaskTree = Object.create(null) as MaskTree
  const nodes: Record<string, unknown> = {}
  const values: Record<string, Record<string, ValueLeft>> = {}
  const chains: Record<string, Record<string, unknown>> = {}
  const missed: Missed[] = []

  for (const [id, node] of Object.entries(source)) {
    if (!wellFormed(node, id)) {
      if (id !== ROOT_ID) {
        nodes[id] = node
        missed.push({ kind: 'lost', id })
      }
      continue
    }
    const def = blockType(node.type)
    if (id === ROOT_ID ? node.type !== ROOT_TYPE || node.parentId !== null : !def) {
      if (id !== ROOT_ID) {
        nodes[id] = node
        missed.push({ kind: 'type', id, type: node.type })
      }
      continue
    }
    const kept = id === ROOT_ID
      ? Object.fromEntries(Object.entries(node.values).filter(([key, value]) =>
          ROOT_KEYS.includes(key) && typeof value === 'string')) as Record<string, PropertyValue>
      : valuesClean(node.type, node.values)
    const valuesNotRead = valuesLeft(node.values, kept, id === ROOT_ID ? null : def?.properties ?? null)
    if (valuesNotRead) values[id] = valuesNotRead
    const events = chainsClean(node.chains, (capability(def, 'events')?.list ?? []).map((event) => event.key))
    const chainsNotRead = chainsLeft(node.chains, events)
    if (chainsNotRead) {
      chains[id] = chainsNotRead
      for (const event of Object.keys(chainsNotRead)) missed.push({ kind: 'chain', id, type: node.type, event })
    }
    read[id] = { id, type: node.type, parentId: node.parentId, values: kept,
      childIds: [...node.childIds], ...(events ? { chains: events } : {}) }
  }
  if (!read[ROOT_ID]) return null
  const tree = treeFromRoot(read)

  const outside = Object.values(read).filter((node) => !tree[node.id])
  for (const node of outside) {
    nodes[node.id] = source[node.id]
    delete values[node.id]
    delete chains[node.id]
  }
  for (const node of outside) {
    const id = node.id
    if (node.parentId !== null && Object.hasOwn(nodes, node.parentId)) continue
    const parent = node.parentId === null ? undefined : tree[node.parentId]
    const refused = parent !== undefined && read[parent.id]?.childIds.includes(id) && !mayContain(parent.type, node.type)
    missed.push(refused
      ? { kind: 'place', id, type: node.type, parentType: parent.type }
      : { kind: 'lost', id })
  }

  const places: Record<string, number> = {}
  for (const [id, node] of Object.entries(nodes)) {
    const parentId = isUnread<BlockNode>(node) && typeof node.parentId === 'string' ? node.parentId : null
    const parent = parentId === null ? undefined : source[parentId]
    const at = isUnread<BlockNode>(parent) && Array.isArray(parent.childIds) ? parent.childIds.indexOf(id) : -1
    if (at >= 0) places[id] = at
  }

  return {
    tree,
    selectedId: typeof raw.selectedId === 'string' && raw.selectedId !== ROOT_ID && tree[raw.selectedId]
      ? raw.selectedId
      : null,
    leftover: { nodes, places, values, chains },
    missed: missed.filter((m) => m.kind !== 'chain' || !Object.hasOwn(nodes, m.id)),
  }
}
