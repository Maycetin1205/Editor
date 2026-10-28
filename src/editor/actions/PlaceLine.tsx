import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Trash2 } from '../icons/icon'
import { cn } from '../widgets/cn'
import { CELL_TEXT, CELL_TEXT_WRAPPED, INPUT, MARKED, TD } from '../widgets/Grid'
import { LINE_HOVER } from '../widgets/lineLook'
import type { ListGroup } from '../widgets/List'
import { OnEscape } from '../widgets/useCloseOnEscape'
import type { Parameter } from '../../core/data/actions'
import { ChoiceCell } from '../origin/ChoiceCell'
import type { PlaceList } from './usePlaces'

interface PlaceLineProps {
  nr: number
  raw: string
  binding: Parameter
  origin: string
  originText: string
  entry: string
  on: boolean
  wraps: boolean
  open: PlaceList | null
  origins: () => ListGroup[]
  entries: () => ListGroup[]
  onSelect: () => void
  onOpen: (list: PlaceList | null) => void
  onOrigin: (origin: string) => void
  onTake: (value: string) => void
  onType: (value: string) => void
  onMove: (by: number) => void
  onDone: () => void
  onRemove?: () => void
}

// Enter and the arrows walk the lines, F4 opens the origins.
function placeKeys({ onMove, onOpen }: Pick<PlaceLineProps, 'onMove' | 'onOpen'>) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      onMove(1)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      onMove(-1)
    }
    if (e.key === 'F4') {
      e.preventDefault()
      onOpen('origin')
    }
  }
}

function OriginCell({ originText, origin, on, open, origins, wraps, onOpen, onOrigin }: PlaceLineProps) {
  const originRef = useRef<HTMLButtonElement>(null)
  return (
    <td className={cn(TD, !on && 'text-muted')} onClick={on ? undefined : () => onOpen('origin')}>
      {on ? (
        <ChoiceCell
          label={originText}
          on={on}
          open={open === 'origin'}
          groups={origins}
          value={origin}
          cellRef={originRef}
          wrap={wraps}
          onOpen={(o) => onOpen(o ? 'origin' : null)}
          onChoose={onOrigin}
        />
      ) : (
        <span className={wraps ? CELL_TEXT_WRAPPED : CELL_TEXT}>{originText}</span>
      )}
    </td>
  )
}

function RemoveButton({ nr, onRemove }: { nr: number; onRemove: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Stelle ${nr} entfernen`}
      title="Stelle entfernen"
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
      className="absolute inset-y-0 right-0 flex items-center px-[8px] text-muted hover:text-error"
    >
      <Trash2 size={13} />
    </button>
  )
}

// The value of a place: typed in, picked from the origin's list, or shown.
function EntryCell(props: PlaceLineProps & { typed: boolean; chosen: boolean }) {
  const { nr, raw, binding, entry, on, open, entries, wraps, typed, chosen, onOpen, onTake, onType, onRemove } = props
  const entryRef = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const text = wraps ? CELL_TEXT_WRAPPED : CELL_TEXT
  useEffect(() => {
    if (on && typed && open === null) input.current?.focus()
  }, [on, typed, open])

  return (
    <td className={cn(TD, 'relative')} onClick={on || !chosen ? undefined : () => onOpen('entry')}>
      {on && typed ? (
        <input
          ref={input}
          aria-label={`${nr} ${raw}`}
          value={binding.source === 'fixed' ? binding.value : ''}
          placeholder={raw}
          spellCheck={false}
          onChange={(e) => onType(e.currentTarget.value)}
          onKeyDown={placeKeys(props)}
          className={cn(INPUT, 'placeholder:font-mono placeholder:text-dense placeholder:text-muted/60')}
        />
      ) : on && chosen ? (
        <ChoiceCell
          label={entry}
          on={on}
          open={open === 'entry'}
          groups={entries}
          value=""
          cellRef={entryRef}
          wrap={wraps}
          onOpen={(o) => onOpen(o ? 'entry' : null)}
          onChoose={onTake}
        />
      ) : entry === '' ? (
        <span className={cn(text, 'font-mono text-dense opacity-40')}>{raw}</span>
      ) : (
        <span className={text}>{entry}</span>
      )}
      {on && onRemove && <RemoveButton nr={nr} onRemove={onRemove} />}
    </td>
  )
}

// One place of the parameter list: number, raw name, origin and value.
export function PlaceLine(props: PlaceLineProps) {
  const { nr, raw, binding, origin, on, wraps, open, onSelect, onDone } = props
  const typed =
    origin === '' ||
    origin === 'fixed' ||
    (origin.startsWith('adopt:') && binding.source === 'fixed' && binding.value !== '')
  const chosen = !typed && origin !== 'previous' && origin !== 'variable'

  return (
    <tr onClick={onSelect} className={cn('group cursor-default', on ? MARKED : LINE_HOVER)}>
      {on && open === null && <OnEscape run={onDone} />}
      <td className={cn(TD, 'px-[10px] text-right font-mono text-dense', !on && 'text-muted')}>{nr}</td>
      <td className={cn(TD, 'px-[10px] font-mono text-dense', wraps ? 'break-words py-[5px]' : 'truncate')} title={raw}>
        {raw}
      </td>
      <OriginCell {...props} />
      <EntryCell {...props} typed={typed} chosen={chosen} />
    </tr>
  )
}
