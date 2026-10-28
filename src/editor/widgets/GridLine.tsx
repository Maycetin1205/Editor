import { useContext, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Trash2 } from '../icons/icon'
import { cn } from './cn'
import { ColumnsOf, leavesLine, Wraps } from './gridContext'
import { CELL_TEXT, CELL_TEXT_WRAPPED, inputClass, MARKED, TD, TYPING } from './gridLook'
import { binArea, LINE_HOVER } from './lineLook'
import { useCloseOnEscape } from './useCloseOnEscape'

interface InputsProps {
  names: readonly string[]
  draft: readonly string[]
  at: number
  bad: boolean
  onDraft: (draft: readonly string[]) => void
  onEnter: () => void
  onLeave: () => void
  onEscape: () => void
}

// The cells of a line being typed in, one input per column.
function Inputs({ names, draft, at, bad, onDraft, onEnter, onLeave, onEscape }: InputsProps) {
  const columns = useContext(ColumnsOf)
  useCloseOnEscape(onEscape)
  return columns.map((c, k) => (
    <td key={k} className={TD}>
      <input
        aria-label={names[k] ?? c.name}
        autoFocus={k === at}
        value={draft[k] ?? ''}
        spellCheck={false}
        className={inputClass(c, bad)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => onDraft(draft.map((x, i) => (i === k ? e.currentTarget.value : x)))}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          onEnter()
        }}
        onBlur={(e) => {
          if (leavesLine(e)) onLeave()
        }}
      />
    </td>
  ))
}

function Bin({ name, marked, onRemove }: { name: string; marked: boolean; onRemove: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={name}
      title="Löschen"
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
      className={binArea(marked)}
    >
      <Trash2 size={13} />
    </button>
  )
}

interface CellsProps {
  cells: readonly string[]
  marked: boolean
  tips: boolean
  removeName: string
  onEdit: (column: number) => void
  onRemove?: () => void
}

// The cells of a line as text; a double click types in the column.
function Cells({ cells, marked, tips, removeName, onEdit, onRemove }: CellsProps) {
  const columns = useContext(ColumnsOf)
  const wraps = useContext(Wraps)
  const last = columns.length - 1
  return columns.map((c, k) => (
    <td
      key={k}
      className={cn(TD, c.mono && 'font-mono text-dense', c.right && 'text-right', k === last && 'relative')}
      title={tips ? cells[k] : undefined}
      onDoubleClick={() => onEdit(k)}
    >
      <span className={cn(wraps ? CELL_TEXT_WRAPPED : CELL_TEXT, wraps && k === last && onRemove && 'pr-[30px]')}>
        {cells[k]}
      </span>
      {k === last && onRemove && <Bin name={removeName} marked={marked} onRemove={onRemove} />}
    </td>
  ))
}

// The arrows walk the lines, Enter and F2 start typing in the first column.
function lineKeys(typing: boolean, edit: (column: number) => void) {
  return (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (typing || e.target !== e.currentTarget) return
    const next =
      e.key === 'ArrowDown'
        ? e.currentTarget.nextElementSibling
        : e.key === 'ArrowUp'
          ? e.currentTarget.previousElementSibling
          : null
    if (next instanceof HTMLElement && next.dataset.gridLine !== undefined) {
      e.preventDefault()
      next.focus()
    }
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      edit(0)
    }
  }
}

interface GridLineProps {
  cells: readonly string[]
  names?: readonly string[]
  marked: boolean
  tips?: boolean
  valid?: (v: readonly string[]) => boolean
  onMark: () => void
  onSave?: (v: readonly string[]) => void
  onRemove?: () => void
  removeName?: string
  // Given, the line can be dragged while it is not being typed in.
  onDragStart?: (e: DragEvent<HTMLTableRowElement>) => void
}

// A line of a table that can be marked, typed in and removed.
export function GridLine(props: GridLineProps) {
  const { cells, names = [], marked, tips = false, valid, onMark, onSave, onRemove, removeName, onDragStart } = props
  const [draft, setDraft] = useState<readonly string[] | null>(null)
  const [at, setAt] = useState(0)
  const row = useRef<HTMLTableRowElement>(null)
  const ok = draft === null || valid === undefined || valid(draft)
  const changed = draft !== null && draft.some((x, k) => x !== (cells[k] ?? ''))

  const edit = (k: number) => {
    if (!onSave) return
    setAt(k)
    setDraft(cells)
  }
  const save = () => {
    if (draft !== null && changed) onSave?.(draft)
    setDraft(null)
  }

  return (
    <tr
      ref={row}
      data-grid-line
      tabIndex={marked ? 0 : -1}
      draggable={onDragStart !== undefined && draft === null}
      onDragStart={onDragStart}
      onFocus={onMark}
      onClick={onMark}
      onKeyDown={lineKeys(draft !== null, edit)}
      className={cn('group cursor-default outline-none', draft !== null ? TYPING : marked ? MARKED : LINE_HOVER)}
    >
      {draft !== null ? (
        <Inputs
          names={names}
          draft={draft}
          at={at}
          bad={!ok}
          onDraft={setDraft}
          onEnter={() => {
            if (ok) {
              save()
              row.current?.focus()
            }
          }}
          onLeave={() => (ok ? save() : setDraft(null))}
          onEscape={() => {
            setDraft(null)
            row.current?.focus()
          }}
        />
      ) : (
        <Cells
          cells={cells}
          marked={marked}
          tips={tips}
          removeName={removeName ?? `${cells[0] ?? ''} löschen`}
          onEdit={edit}
          onRemove={onRemove}
        />
      )}
    </tr>
  )
}
