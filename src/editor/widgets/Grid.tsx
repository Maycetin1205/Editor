import { useContext, type ReactNode } from 'react'
import { Plus } from '../icons/icon'
import { cn } from './cn'
import { ColumnsOf, Wraps, type GridColumn } from './gridContext'
import { TD, TH } from './gridLook'
import { LINE_HOVER } from './lineLook'

// The table widgets are reached through this file; each lives in its own.
export { CELL_TEXT, CELL_TEXT_WRAPPED, INPUT, MARKED, TD } from './gridLook'
export { GridLine } from './GridLine'
export { GridNewLine } from './GridNewLine'
export { NAME, SETTINGS, Strip, STRIP_FIELD } from './Strip'

// A table with fixed columns and a sticky head. A click on its empty part
// below the lines calls `onEmpty`.
export function Grid({
  columns,
  fill = true,
  wrap = false,
  onEmpty,
  children,
}: {
  columns: readonly GridColumn[]
  fill?: boolean
  wrap?: boolean
  onEmpty?: () => void
  children: ReactNode
}) {
  return (
    <div
      className={cn('overflow-y-auto overflow-x-hidden', fill && 'min-h-0 flex-1')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onEmpty?.()
      }}
    >
      <table className="w-full table-fixed border-collapse text-ui">
        <colgroup>
          {columns.map((c, k) => (
            <col key={k} style={c.width === undefined ? undefined : { width: c.width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-[1]">
          <tr>
            {columns.map((c, k) => (
              <th key={k} className={cn(TH, c.right && 'text-right')}>
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <ColumnsOf.Provider value={columns}>
            <Wraps.Provider value={wrap}>{children}</Wraps.Provider>
          </ColumnsOf.Provider>
        </tbody>
      </table>
    </div>
  )
}

export function GridAddLine({ children, onAdd }: { children: ReactNode; onAdd: () => void }) {
  const columns = useContext(ColumnsOf)
  return (
    <tr className={cn('cursor-pointer text-muted hover:text-ink', LINE_HOVER)} onClick={onAdd}>
      <td className={TD} />
      <td className={cn(TD, 'px-[10px]')} colSpan={columns.length - 1}>
        <span className="flex items-center gap-[8px]">
          <Plus size={13} className="text-accent" /> {children}
        </span>
      </td>
    </tr>
  )
}
