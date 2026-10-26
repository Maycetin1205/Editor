import { createContext, type FocusEvent } from 'react'

export interface GridColumn {
  name: string
  width?: number
  mono?: boolean
  right?: boolean
}

// What the table tells its lines: its columns and whether cells wrap.
export const ColumnsOf = createContext<readonly GridColumn[]>([])
export const Wraps = createContext(false)

// Whether the focus goes somewhere outside the line of this cell.
export const leavesLine = (e: FocusEvent<HTMLElement>): boolean =>
  !(e.currentTarget.closest('tr')?.contains(e.relatedTarget as Node | null) ?? false)
