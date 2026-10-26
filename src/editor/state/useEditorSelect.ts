import { useEditorInstance } from './EditorContext'
import type { EditorStore } from './EditorStore'
import { useStoreSelect } from './useStoreSelect'

// A part of the editor's state: the component draws again only when that
// part changes, not on every change of the mask. Without same, the selector
// must return a primitive or a stable reference; with it (sameItems,
// sameFields), a fresh array or object is fine.
export function useEditorSelect<T>(select: (editor: EditorStore) => T, same?: (a: T, b: T) => boolean): T {
  return useStoreSelect(useEditorInstance(), select, same)
}
