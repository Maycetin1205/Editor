import { capability, type EntryEvents } from '../../core/block/capability'
import type { ListBinding } from '../../core/block/listBinding'
import { blockType } from '../../core/block/registry'
import type { BlockNode } from '../../core/block/tree'
import type { EditorStore } from '../state/EditorStore'

interface EntryEventsAt {
  events: EntryEvents
  binding: ListBinding
  pool: readonly string[]
}

export function entryEventsOf(block: BlockNode | undefined): EntryEventsAt | undefined {
  const def = blockType(block?.type ?? '')
  const on = capability(def, 'events')
  const binding = capability(def, 'list')?.binding
  if (!on?.entries || !binding || binding.prop !== on.entries.prop) return undefined
  return { events: on.entries, binding, pool: on.list.filter((ev) => ev.entry).map((ev) => ev.key) }
}

export interface EntryChain {
  index: number
  title: string
  key: string | undefined
}

export function entryChainsOf(block: BlockNode): EntryChain[] {
  const at = entryEventsOf(block)
  if (!at) return []
  return at.binding.entries(block.values[at.binding.prop]).map((entry, index) => ({
    index,
    title: at.binding.titleOf(entry).trim(),
    key: at.events.keyOf(entry),
  }))
}

export function entryStepCount(block: BlockNode): number {
  return entryChainsOf(block)
    .reduce((n, { key }) => n + (key === undefined ? 0 : block.chains?.[key]?.length ?? 0), 0)
}

// The key under which the chain of the entry sits; an entry without one takes
// the first free key of the block, and a chain left there from an entry long
// gone is dropped.
export function claimEntryKey(ed: EditorStore, blockId: string, index: number): string | null {
  const node = ed.tree[blockId]
  const at = entryEventsOf(node)
  if (!node || !at) return null
  const entries = at.binding.entries(node.values[at.binding.prop])
  const entry = entries[index]
  if (entry === undefined) return null
  const own = at.events.keyOf(entry)
  if (own !== undefined) return own
  const taken = new Set(entries.map((e) => at.events.keyOf(e)))
  const free = at.pool.filter((key) => !taken.has(key))
  const key = free.find((k) => (node.chains?.[k]?.length ?? 0) === 0) ?? free[0]
  if (key === undefined) return null
  ed.transaction(() => {
    ed.updateProperty(blockId, at.binding.prop, entries.map((e, i) => (i === index ? at.events.withKey(e, key) : e)))
    const chains = ed.tree[blockId]?.chains
    if ((chains?.[key]?.length ?? 0) > 0) {
      const rest = { ...chains }
      delete rest[key]
      ed.updateBlockEvents(blockId, rest)
    }
  })
  return key
}

// An entry whose chain is empty gives its key back, so that it no longer shows
// as clickable.
export function releaseEmptyEntryKeys(ed: EditorStore, blockId: string): void {
  const node = ed.tree[blockId]
  const at = entryEventsOf(node)
  if (!node || !at) return
  const entries = at.binding.entries(node.values[at.binding.prop])
  let changed = false
  const next = entries.map((entry) => {
    const key = at.events.keyOf(entry)
    if (key === undefined || (node.chains?.[key]?.length ?? 0) > 0) return entry
    changed = true
    return at.events.withKey(entry, undefined)
  })
  if (changed) ed.updateProperty(blockId, at.binding.prop, next)
}
