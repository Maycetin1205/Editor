import type { ReactNode } from 'react'
import type { EditorStore } from './EditorStore'
import { EditorContext } from './useEditor'

interface EditorProviderProps {
  editor: EditorStore
  children: ReactNode
}

export function EditorProvider({ editor, children }: EditorProviderProps) {
  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}
