import { useCallback, useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'
import type { EditorView } from './editorStore/viewState'

export function useView(): EditorView {
  const view = useEditorInstance().view
  const subscribe = useCallback((cb: () => void) => view.subscribe(cb), [view])
  const version = useCallback(() => view.version, [view])
  useSyncExternalStore(subscribe, version)
  return view
}
