import { useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'
import type { EditorView } from './editorStore/viewState'

export function useView(): EditorView {
  const view = useEditorInstance().view
  useSyncExternalStore(
    (cb) => view.subscribe(cb),
    () => view.version,
  )
  return view
}
