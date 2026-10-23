import { useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'
import type { EditorStore } from './EditorStore'

export function useView(): EditorStore {
  const editor = useEditorInstance()
  useSyncExternalStore(
    (cb) => editor.view.subscribe(cb),
    () => editor.viewVersion,
  )
  return editor
}
