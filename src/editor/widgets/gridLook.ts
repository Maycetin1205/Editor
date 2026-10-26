import { cn } from './cn'
import type { GridColumn } from './gridContext'
import { ROW_CHOSEN } from './lineLook'

export const TH =
  'h-[28px] truncate border-b border-line-soft bg-panel px-[10px] text-left text-dense font-bold text-muted'
export const TD = 'h-[29px] border-b border-line-soft p-0'
export const CELL_TEXT = 'block truncate px-[10px]'
export const CELL_TEXT_WRAPPED = 'block break-words px-[10px] py-[5px]'
export const INPUT =
  'h-[28px] w-full min-w-0 bg-transparent px-[10px] text-ui text-ink outline-none placeholder:text-muted'
export const MARKED = ROW_CHOSEN
export const TYPING = 'bg-panel'

export const inputClass = (c: GridColumn, bad: boolean): string =>
  cn(INPUT, c.mono && 'font-mono text-dense', c.right && 'text-right', bad && 'text-error')
