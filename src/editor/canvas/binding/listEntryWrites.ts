import { entriesWithValue, entryValues, innerOf, withInner, type ListBinding } from '../../../core/block/blockType'
import type { BlockNode } from '../../../core/block/tree'
import type { EditorStore } from '../../state/EditorStore'

// The writes the bar of one list entry makes: into the entry, into the inner
// list of the entry, or the entry out of the list.
export function listEntryWrites(editor: EditorStore, block: BlockNode, listBinding: ListBinding, index: number) {
  const entriesOf = (): unknown[] => listBinding.entries(block.values[listBinding.prop])

  const writeInEntry = (change: (entry: unknown) => unknown): void => {
    const next = entriesOf()
    const target = next[index]
    if (target === undefined) return
    next[index] = change(target)
    editor.updateProperty(block.id, listBinding.prop, next)
  }

  const writeInner = (change: (inner: readonly unknown[]) => readonly unknown[] | null): boolean => {
    const entries = entriesOf()
    const next = change(innerOf(listBinding, entries[index]))
    if (next === null) return false
    return editor.updateProperty(block.id, listBinding.prop, withInner(listBinding, entries, index, next))
  }

  const innerGroup = (at: number, inner: ListBinding, own: unknown) => ({
    properties: Object.entries(inner.entryProperties ?? {}),
    access: {
      values: entryValues(inner, own),
      set: (key: string, value: unknown) => {
        writeInner((list) => entriesWithValue(inner, list, at, key, value))
      },
    },
  })

  const setEntryValue = (key: string, value: unknown): void => {
    editor.updateProperty(block.id, listBinding.prop, entriesWithValue(listBinding, entriesOf(), index, key, value))
  }

  // False when the list keeps the entry.
  const removeEntry = (): boolean => {
    const next = listBinding.entryRemove?.(entriesOf(), index) ?? null
    if (next === null) return false
    editor.updateProperty(block.id, listBinding.prop, next)
    return true
  }

  return { entriesOf, writeInEntry, writeInner, innerGroup, setEntryValue, removeEntry }
}

export type ListEntryWrites = ReturnType<typeof listEntryWrites>
