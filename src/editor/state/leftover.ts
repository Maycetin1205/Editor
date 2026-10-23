import type { PropertyValue } from '../../core/block/property'
import type { BlockNode, MaskTree } from '../../core/block/tree'
import type { DataSource } from '../../core/data/dataSources'

// What a mask file holds and this editor could not read: blocks of unknown
// type or without a valid place, values and action chains it does not know,
// data sources it cannot read. It stays untouched and goes back into the file
// on every save, so a newer editor finds its parts again.

export interface ValueLeft {
  raw: unknown
  readAs?: PropertyValue
}

export interface SourceLeft {
  raw: unknown
  readAs?: DataSource
}

export interface Leftover {
  nodes: Readonly<Record<string, unknown>>
  places: Readonly<Record<string, number>>
  values: Readonly<Record<string, Readonly<Record<string, ValueLeft>>>>
  chains: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  dataSources: readonly SourceLeft[]
  relation: readonly unknown[]
}

export const NO_LEFTOVER: Leftover = { nodes: {}, places: {}, values: {}, chains: {}, dataSources: [], relation: [] }

interface LeftoverPart {
  nodes?: Record<string, unknown>
  places?: Record<string, number>
  chains?: Record<string, Record<string, unknown>>
  dataSources?: unknown[]
  relation?: unknown[]
}

export interface Known {
  nodes: ReadonlySet<string>
  chains: ReadonlySet<string>
  dataSources: ReadonlySet<string>
  relation: ReadonlySet<string>
}

function isPlain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function chainKey(nodeId: string, event: string): string {
  return `${nodeId}\u0000${event}`
}

export function idOf(raw: unknown): string {
  return isPlain(raw) && typeof raw.id === 'string' ? raw.id : ''
}

export function leftoverEmpty(left: Leftover): boolean {
  return Object.keys(left.nodes).length === 0 && Object.keys(left.values).length === 0
    && Object.keys(left.chains).length === 0 && left.dataSources.length === 0 && left.relation.length === 0
}

// The tree as it goes into the file: values this editor could not read stand
// again where they stood, unless the block was changed there since.
export function treeForFile(tree: MaskTree, left: Leftover): MaskTree {
  let out: MaskTree | null = null
  for (const [id, kept] of Object.entries(left.values)) {
    const node = tree[id]
    if (!node) continue
    let values: Record<string, unknown> | null = null
    for (const [key, { raw, readAs }] of Object.entries(kept)) {
      const present = Object.hasOwn(node.values, key)
      if (present && (readAs === undefined || !same(node.values[key], readAs))) continue
      values ??= { ...node.values }
      values[key] = raw
    }
    if (values === null) continue
    out ??= { ...tree }
    out[id] = { ...node, values: values as BlockNode['values'] }
  }
  return out ?? tree
}

// The names of the values per block that still go back as they were read,
// as treeForFile writes them.
export function valuesKept(tree: MaskTree, left: Leftover): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [id, kept] of Object.entries(left.values)) {
    const node = tree[id]
    if (!node) continue
    const keys = Object.entries(kept)
      .filter(([key, { readAs }]) => !Object.hasOwn(node.values, key)
        || (readAs !== undefined && same(node.values[key], readAs)))
      .map(([key]) => key)
    if (keys.length > 0) out[id] = keys
  }
  return out
}

// The part that cannot stand in the tree: it is written next to it.
export function leftoverForFile(
  tree: MaskTree,
  sources: readonly DataSource[],
  left: Leftover,
): LeftoverPart | undefined {
  const part: LeftoverPart = {}
  if (Object.keys(left.nodes).length > 0) {
    part.nodes = { ...left.nodes }
    const places = Object.fromEntries(Object.entries(left.places).filter(([id]) => id in left.nodes))
    if (Object.keys(places).length > 0) part.places = places
  }
  const chains: Record<string, Record<string, unknown>> = {}
  for (const [id, events] of Object.entries(left.chains)) {
    const node = tree[id]
    if (!node) continue
    const kept = Object.fromEntries(Object.entries(events).filter(([event]) => !node.chains?.[event]?.length))
    if (Object.keys(kept).length > 0) chains[id] = kept
  }
  if (Object.keys(chains).length > 0) part.chains = chains
  const dataSources = left.dataSources
    .filter(({ raw, readAs }) => readAs === undefined || same(sources.find((s) => s.id === idOf(raw)), readAs))
    .map(({ raw }) => raw)
  if (dataSources.length > 0) part.dataSources = dataSources
  if (left.relation.length > 0) part.relation = [...left.relation]
  return Object.keys(part).length > 0 ? part : undefined
}

// Puts what a file kept aside back into its tree and its data sources before
// they are read, so an editor that knows them now takes them up again.
export function withLeftover(
  state: Record<string, unknown>,
  kept: unknown,
): { state: Record<string, unknown>; known: Known } {
  const known = {
    nodes: new Set<string>(), chains: new Set<string>(), dataSources: new Set<string>(), relation: new Set<string>(),
  }
  if (!isPlain(kept)) return { state, known }
  const tree: Record<string, unknown> = isPlain(state.tree) ? { ...state.tree } : {}
  const places = isPlain(kept.places) ? kept.places : {}

  for (const [id, raw] of Object.entries(isPlain(kept.nodes) ? kept.nodes : {})) {
    known.nodes.add(id)
    if (Object.hasOwn(tree, id)) continue
    tree[id] = raw
    const parentId = isPlain(raw) ? raw.parentId : undefined
    const parent = typeof parentId === 'string' ? tree[parentId] : undefined
    if (!isPlain(parent) || !Array.isArray(parent.childIds) || parent.childIds.includes(id)) continue
    const childIds = [...parent.childIds as unknown[]]
    const at = typeof places[id] === 'number' ? Math.min(Math.max(0, places[id]), childIds.length) : childIds.length
    childIds.splice(at, 0, id)
    tree[parentId as string] = { ...parent, childIds }
  }

  for (const [id, events] of Object.entries(isPlain(kept.chains) ? kept.chains : {})) {
    if (!isPlain(events)) continue
    for (const event of Object.keys(events)) known.chains.add(chainKey(id, event))
    const node = tree[id]
    if (!isPlain(node)) continue
    const chains = isPlain(node.chains) ? node.chains : {}
    const missing = Object.fromEntries(Object.entries(events).filter(([event]) => !Object.hasOwn(chains, event)))
    if (Object.keys(missing).length > 0) tree[id] = { ...node, chains: { ...missing, ...chains } }
  }

  const dataSources = listWith(state.dataSources, kept.dataSources, known.dataSources)
  const relation = listWith(state.relation, kept.relation, known.relation)
  return { state: { ...state, tree, dataSources, relation }, known }
}

// What was kept aside stands in for the entry of the same id: the file holds
// there only what an older editor made of it.
function listWith(list: unknown, kept: unknown, known: Set<string>): unknown {
  if (!Array.isArray(kept)) return list
  const out: unknown[] = Array.isArray(list) ? [...list as unknown[]] : []
  for (const raw of kept as unknown[]) {
    const id = idOf(raw)
    if (id !== '') known.add(id)
    const at = id === '' ? -1 : out.findIndex((e) => idOf(e) === id)
    if (at < 0) out.push(raw)
    else out[at] = raw
  }
  return out
}
