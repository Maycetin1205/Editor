import {
  createContext,
  useContext,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Plus, Trash2 } from '@/editor/icons/icon'
import { cn } from './cn'
import { binArea, LINE_HOVER, ROW_CHOSEN } from './lineLook'
import { OnEscape, useCloseOnEscape } from './useCloseOnEscape'

interface GridColumn {
  name: string
  width?: number
  mono?: boolean
  right?: boolean
}

const TH = 'h-[28px] truncate border-b border-line-soft bg-panel px-[10px] text-left text-dense font-bold text-muted'
export const TD = 'h-[29px] border-b border-line-soft p-0'
export const CELL_TEXT = 'block truncate px-[10px]'
export const CELL_TEXT_WRAPPED = 'block break-words px-[10px] py-[5px]'
export const INPUT = 'h-[28px] w-full min-w-0 bg-transparent px-[10px] text-ui text-ink outline-none'
export const MARKED = ROW_CHOSEN
const TYPING = 'bg-panel'

export function Strip({ children, right, wrap = false }: { children: ReactNode; right?: ReactNode; wrap?: boolean }) {
  return (
    <div className={cn(
      'flex shrink-0 items-center gap-[8px] border-b border-line-soft bg-panel px-[12px] text-ui font-bold text-ink',
      wrap ? 'min-h-[36px] py-[8px]' : 'h-[36px]',
    )}
    >
      <span className={cn('flex min-w-0 items-center gap-[8px]', !wrap && 'truncate')}>{children}</span>
      {right !== undefined && <span className="ml-auto flex shrink-0 items-center text-dense font-semibold text-muted">{right}</span>}
    </div>
  )
}

export const SETTINGS = 'grid items-center gap-[8px] border-b border-line-soft px-[12px] py-[8px]'
export const NAME = 'text-dense font-semibold text-muted'
export const STRIP_FIELD = 'h-[28px] w-[260px]'

const ColumnsOf = createContext<readonly GridColumn[]>([])
const Wraps = createContext(false)

export function Grid({ columns, fill = true, wrap = false, onEmpty, children }: {
  columns: readonly GridColumn[]
  fill?: boolean
  wrap?: boolean
  onEmpty?: () => void
  children: ReactNode
}) {
  return (
    <div
      className={cn('overflow-y-auto overflow-x-hidden', fill && 'min-h-0 flex-1')}
      onClick={(e) => { if (e.target === e.currentTarget) onEmpty?.() }}
    >
      <table className="w-full table-fixed border-collapse text-ui">
        <colgroup>
          {columns.map((c, k) => <col key={k} style={c.width === undefined ? undefined : { width: c.width }} />)}
        </colgroup>
        <thead className="sticky top-0 z-[1]">
          <tr>
            {columns.map((c, k) => <th key={k} className={cn(TH, c.right && 'text-right')}>{c.name}</th>)}
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

const leavesLine = (e: FocusEvent<HTMLElement>): boolean =>
  !(e.currentTarget.closest('tr')?.contains(e.relatedTarget as Node | null) ?? false)

const inputClass = (c: GridColumn, bad: boolean): string =>
  cn(INPUT, c.mono && 'font-mono text-dense', c.right && 'text-right', bad && 'text-error')

function Inputs({ names, draft, at, bad, onDraft, onEnter, onLeave, onEscape }: {
  names: readonly string[]
  draft: readonly string[]
  at: number
  bad: boolean
  onDraft: (draft: readonly string[]) => void
  onEnter: () => void
  onLeave: () => void
  onEscape: () => void
}) {
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
        onBlur={(e) => { if (leavesLine(e)) onLeave() }}
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
      onClick={(e) => { e.stopPropagation(); onRemove() }}
      className={binArea(marked)}
    >
      <Trash2 size={13} />
    </button>
  )
}

export function GridLine({ cells, names = [], marked, tips = false, valid, onMark, onSave, onRemove, removeName }: {
  cells: readonly string[]
  names?: readonly string[]
  marked: boolean
  tips?: boolean
  valid?: (v: readonly string[]) => boolean
  onMark: () => void
  onSave?: (v: readonly string[]) => void
  onRemove?: () => void
  removeName?: string
}) {
  const columns = useContext(ColumnsOf)
  const wraps = useContext(Wraps)
  const [draft, setDraft] = useState<readonly string[] | null>(null)
  const [at, setAt] = useState(0)
  const row = useRef<HTMLTableRowElement>(null)
  const ok = draft === null || valid === undefined || valid(draft)
  const changed = draft !== null && draft.some((x, k) => x !== (cells[k] ?? ''))
  const last = columns.length - 1

  const edit = (k: number) => {
    if (!onSave) return
    setAt(k)
    setDraft(cells)
  }
  const save = () => {
    if (draft !== null && changed) onSave?.(draft)
    setDraft(null)
  }

  const onKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (draft !== null || e.target !== e.currentTarget) return
    const next = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling
      : e.key === 'ArrowUp' ? e.currentTarget.previousElementSibling : null
    if (next instanceof HTMLElement && next.dataset.gridLine !== undefined) {
      e.preventDefault()
      next.focus()
    }
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      edit(0)
    }
  }

  return (
    <tr
      ref={row}
      data-grid-line
      tabIndex={marked ? 0 : -1}
      onFocus={onMark}
      onClick={onMark}
      onKeyDown={onKey}
      className={cn(
        'group cursor-default outline-none',
        draft !== null ? TYPING : marked ? MARKED : LINE_HOVER,
      )}
    >
      {draft !== null
        ? (
            <Inputs
              names={names}
              draft={draft}
              at={at}
              bad={!ok}
              onDraft={setDraft}
              onEnter={() => { if (ok) { save(); row.current?.focus() } }}
              onLeave={() => (ok ? save() : setDraft(null))}
              onEscape={() => { setDraft(null); row.current?.focus() }}
            />
          )
        : columns.map((c, k) => (
            <td
              key={k}
              className={cn(TD, c.mono && 'font-mono text-dense', c.right && 'text-right', k === last && 'relative')}
              title={tips ? cells[k] : undefined}
              onDoubleClick={() => edit(k)}
            >
              <span className={cn(wraps ? CELL_TEXT_WRAPPED : CELL_TEXT, wraps && k === last && onRemove && 'pr-[30px]')}>{cells[k]}</span>
              {k === last && onRemove && <Bin name={removeName ?? `${cells[0] ?? ''} löschen`} marked={marked} onRemove={onRemove} />}
            </td>
          ))}
    </tr>
  )
}

export function GridNewLine({ names, valid, onAdd }: {
  names: readonly string[]
  valid: (v: readonly string[]) => boolean
  onAdd: (v: readonly string[]) => boolean
}) {
  const columns = useContext(ColumnsOf)
  const empty = columns.map(() => '')
  const [v, setV] = useState<readonly string[]>(empty)
  const first = useRef<HTMLInputElement>(null)
  const typed = v.some((x) => x.trim() !== '')
  const ok = !typed || valid(v)
  const add = (): boolean => {
    if (!typed || !onAdd(v)) return false
    setV(empty)
    return true
  }
  return (
    <tr className={cn(LINE_HOVER, 'focus-within:bg-panel')}>
      {columns.map((c, k) => (
        <td key={k} className={TD}>
          <input
            ref={k === 0 ? first : undefined}
            aria-label={names[k] ?? c.name}
            value={v[k] ?? ''}
            spellCheck={false}
            className={inputClass(c, !ok)}
            onChange={(e) => setV(v.map((x, i) => (i === k ? e.currentTarget.value : x)))}
            onKeyDown={(e) => { if (e.key === 'Enter' && add()) first.current?.focus() }}
            onBlur={(e) => { if (leavesLine(e)) add() }}
          />
        </td>
      ))}
      {typed && <OnEscape run={() => setV(empty)} />}
    </tr>
  )
}

export function GridAddLine({ children, onAdd }: { children: ReactNode; onAdd: () => void }) {
  const columns = useContext(ColumnsOf)
  return (
    <tr className={cn('cursor-pointer text-muted hover:text-ink', LINE_HOVER)} onClick={onAdd}>
      <td className={TD} />
      <td className={cn(TD, 'px-[10px]')} colSpan={columns.length - 1}>
        <span className="flex items-center gap-[8px]"><Plus size={13} className="text-accent" /> {children}</span>
      </td>
    </tr>
  )
}
