import { createContext, useContext } from 'react'
import type { EditorStore } from './EditorStore'
import type { EditorView } from './editorStore/viewState'
import type { MaskFolder } from './maskFolder'
import { useStoreSelect } from './useStoreSelect'

// The editor's store in React. Each hook hands out one part of the store and
// draws the component again when that part changes.

export const EditorContext = createContext<EditorStore | null>(null)

export function useEditorInstance(): EditorStore {
  const instance = useContext(EditorContext)
  if (!instance) {
    throw new Error('EditorProvider fehlt — die App muss in <EditorProvider> eingespannt sein.')
  }
  return instance
}

interface Versioned {
  subscribe(listener: () => void): () => void
  readonly version: number
}

// Every change of a store raises its version, so the component draws again
// on every change.
function useWatched<S extends Versioned>(store: S): S {
  useStoreSelect(store, (s) => s.version)
  return store
}

export function useEditor(): EditorStore {
  return useWatched(useEditorInstance())
}

export function useView(): EditorView {
  return useWatched(useEditorInstance().view)
}

export function useDataSources(): EditorStore['dataSources'] {
  return useWatched(useEditorInstance().dataSources)
}

export function useRelations(): EditorStore['relation'] {
  return useWatched(useEditorInstance().relation)
}

export function useMaskFolder(): MaskFolder {
  return useWatched(useEditorInstance().files.maskFolder)
}

// Only a part of the editor's state: the component draws again when that part
// changes, not on every change of the mask. Without same, the selector must
// return a primitive or a stable reference; with it (sameItems, sameFields),
// a fresh array or object is fine.
export function useEditorSelect<T>(select: (editor: EditorStore) => T, same?: (a: T, b: T) => boolean): T {
  return useStoreSelect(useEditorInstance(), select, same)
}
