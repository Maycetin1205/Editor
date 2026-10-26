import { useCallback, useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'
import type { EditorStore } from './EditorStore'

// A part of the editor's state: the component draws again only when the
// selected value changes, not on every change of the mask. The selector
// must return a primitive or a stable reference.
export function useEditorSelect<T>(select: (editor: EditorStore) => T): T {
  const editor = useEditorInstance()
  const subscribe = useCallback((cb: () => void) => editor.subscribe(cb), [editor])
  const snapshot = useCallback(() => select(editor), [editor, select])
  return useSyncExternalStore(subscribe, snapshot)
}
