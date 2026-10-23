import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown, Trash2 } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { CELL_TEXT, CELL_TEXT_WRAPPED, Grid, GridAddLine, INPUT, MARKED, TD } from '@/editor/widgets/Grid'
import { LINE_HOVER } from '@/editor/widgets/lineLook'
import type { ListGroup } from '@/editor/widgets/List'
import { OnEscape } from '@/editor/widgets/useCloseOnEscape'
import type { Parameter } from '../../core/data/actions'
import type { RelationTemplate } from '../../core/data/relations'
import { ChoiceCell } from '../origin/ChoiceCell'
import type { Reach } from '../origin/reach'
import { adoptedField, fieldAdopt } from './fieldAdopt'
import {
  entryText,
  placeEmpty,
  placeEntries,
  placeEntry,
  placeGroups,
  placeOrigin,
  placeOriginName,
  placePicked,
} from './placeOrigins'

export interface Filled {
  parameter: readonly Parameter[]
  extraParameter: readonly Parameter[]
}

const EMPTY: Parameter = { source: 'fixed', value: '' }

const COLUMNS = [
  { name: 'Nr.', width: 44, right: true },
  { name: 'Bezeichnung', width: 150 },
  { name: 'Herkunft', width: 240 },
  { name: 'Eingabe' },
]

export function Result({ template, filled, reach }: { template: RelationTemplate; filled: Filled; reach: Reach }) {
  const all = [...filled.parameter, ...filled.extraParameter]
  return (
    <div className="break-all border-b border-line-soft px-[12px] py-[9px] font-mono text-dense leading-[19px] text-muted">
      {template.verb}[{template.nr}
      {all.map((b, k) => {
        const entry = placeEntry(b, reach)
        return (
          <span key={k}>
            !
            {entry !== '' && <span className="font-semibold text-ink">{b.source === 'fixed' ? entry : `{${entry}}`}</span>}
          </span>
        )
      })}
      ]
    </div>
  )
}

type Open = { at: number; list: 'origin' | 'entry' } | null

export function Places({ template, filled, reach, extras = true, fill = true, fold = false, wrap = false, onChange }: {
  template: RelationTemplate
  filled: Filled
  reach: Reach
  extras?: boolean
  fill?: boolean
  fold?: boolean
  wrap?: boolean
  onChange: (filled: Filled) => void
}) {
  const all = [...filled.parameter, ...filled.extraParameter]
  const used = all.filter((b) => !placeEmpty(b)).length
  const [selected, setSelected] = useState<number | null>(null)
  const [pending, setPending] = useState<{ at: number; origin: string } | null>(null)
  const [open, setOpen] = useState<Open>(null)
  const [shut, setShut] = useState(used > 0)
  const fixedCount = filled.parameter.length
  const sources = reach.sources ?? []
  const adopted = adoptedField(template, filled.parameter, sources)
  const folding = fold && used > 0 && used < all.length
  const shown = all.map((b, i) => !(folding && shut) || !placeEmpty(b) || selected === i || pending?.at === i)
  const hidden = shown.filter((s) => !s).length

  const set = (i: number, b: Parameter) => onChange(i < fixedCount
    ? { ...filled, parameter: filled.parameter.map((x, k) => (k === i ? b : x)) }
    : { ...filled, extraParameter: filled.extraParameter.map((x, k) => (k === i - fixedCount ? b : x)) })
  const take = (i: number, value: string) => {
    setPending(null)
    setOpen(null)
    const picked = placePicked(value)
    if (picked === null) return
    if ('set' in picked) {
      set(i, picked.set)
      return
    }
    const source = sources.find((s) => s.id === picked.adopt.sourceId)
    if (source) onChange({ ...filled, parameter: fieldAdopt(filled.parameter, template, source, picked.adopt.code) })
  }
  const chooseOrigin = (i: number, origin: string) => {
    setOpen(null)
    if (origin === 'fixed') {
      setPending(null)
      if (all[i]?.source !== 'fixed') set(i, EMPTY)
      return
    }
    const entries = placeEntries(origin, reach).flatMap((g) => g.entries)
    if (entries.length === 1 && entries[0]) {
      take(i, entries[0].value)
      return
    }
    set(i, EMPTY)
    setPending({ at: i, origin })
    setOpen({ at: i, list: 'entry' })
  }
  const move = (from: number, by: number) => {
    let to = from + by
    while (to >= 0 && to < all.length && shown[to] !== true) to += by
    if (to >= 0 && to < all.length) setSelected(to)
  }

  return (
    <Grid columns={COLUMNS} fill={fill} wrap={wrap}>
      {all.map((b, i) => {
        if (shown[i] !== true) return null
        const raw = template.parameter[i] ?? '…'
        const origin = pending?.at === i ? pending.origin : placeOrigin(b, raw, adopted)
        return (
          <PlaceLine
            key={i}
            nr={i + 1}
            raw={raw}
            binding={b}
            origin={origin}
            originText={placeOriginName(origin, reach, adopted?.label)}
            entry={pending?.at === i ? '' : entryText(b, reach)}
            on={selected === i}
            wraps={wrap}
            open={open?.at === i ? open.list : null}
            origins={() => placeGroups(raw, reach)}
            entries={() => placeEntries(origin, reach)}
            onSelect={() => {
              if (selected !== i) setPending(null)
              setSelected(i)
            }}
            onOpen={(list) => setOpen(list === null ? null : { at: i, list })}
            onOrigin={(o) => chooseOrigin(i, o)}
            onTake={(value) => take(i, value)}
            onType={(value) => set(i, { source: 'fixed', value })}
            onMove={(by) => move(i, by)}
            onDone={() => {
              setPending(null)
              setSelected(null)
            }}
            onRemove={i >= fixedCount
              ? () => {
                  onChange({ ...filled, extraParameter: filled.extraParameter.filter((_, k) => k !== i - fixedCount) })
                  setSelected(null)
                }
              : undefined}
          />
        )
      })}
      {folding && (hidden > 0 || !shut) && (
        <FoldLine shut={shut} onToggle={() => setShut(!shut)}>
          {shut ? `${hidden} leere ${hidden === 1 ? 'Stelle' : 'Stellen'}` : 'Leere Stellen einklappen'}
        </FoldLine>
      )}
      {extras && template.extraParameterAllowed === true && (
        <GridAddLine
          onAdd={() => {
            onChange({ ...filled, extraParameter: [...filled.extraParameter, EMPTY] })
            setSelected(all.length)
          }}
        >
          Stelle hinzufügen
        </GridAddLine>
      )}
    </Grid>
  )
}

function FoldLine({ shut, onToggle, children }: { shut: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <tr className={cn('text-muted hover:text-ink', LINE_HOVER)}>
      <td className={TD} />
      <td className={TD} colSpan={COLUMNS.length - 1}>
        <button
          type="button"
          aria-expanded={!shut}
          onClick={onToggle}
          className="flex h-[28px] w-full items-center gap-[8px] px-[10px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        >
          <ChevronDown size={13} aria-hidden className={cn('shrink-0 transition-transform', shut && '-rotate-90')} />
          {children}
        </button>
      </td>
    </tr>
  )
}

function PlaceLine({
  nr, raw, binding, origin, originText, entry, on, wraps, open, origins, entries,
  onSelect, onOpen, onOrigin, onTake, onType, onMove, onDone, onRemove,
}: {
  nr: number
  raw: string
  binding: Parameter
  origin: string
  originText: string
  entry: string
  on: boolean
  wraps: boolean
  open: 'origin' | 'entry' | null
  origins: () => ListGroup[]
  entries: () => ListGroup[]
  onSelect: () => void
  onOpen: (list: 'origin' | 'entry' | null) => void
  onOrigin: (origin: string) => void
  onTake: (value: string) => void
  onType: (value: string) => void
  onMove: (by: number) => void
  onDone: () => void
  onRemove?: () => void
}) {
  const originRef = useRef<HTMLButtonElement>(null)
  const entryRef = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const text = wraps ? CELL_TEXT_WRAPPED : CELL_TEXT
  const typed = origin === '' || origin === 'fixed' || (origin.startsWith('adopt:') && binding.source === 'fixed' && binding.value !== '')
  const chosen = !typed && origin !== 'previous' && origin !== 'variable'
  useEffect(() => { if (on && typed && open === null) input.current?.focus() }, [on, typed, open])

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); onMove(1) }
    if (e.key === 'ArrowUp') { e.preventDefault(); onMove(-1) }
    if (e.key === 'F4') { e.preventDefault(); onOpen('origin') }
  }

  return (
    <tr onClick={onSelect} className={cn('group cursor-default', on ? MARKED : LINE_HOVER)}>
      {on && open === null && <OnEscape run={onDone} />}
      <td className={cn(TD, 'px-[10px] text-right font-mono text-dense', !on && 'text-muted')}>{nr}</td>
      <td className={cn(TD, 'px-[10px] font-mono text-dense', wraps ? 'break-words py-[5px]' : 'truncate')} title={raw}>{raw}</td>
      <td className={cn(TD, !on && 'text-muted')} onClick={on ? undefined : () => onOpen('origin')}>
        {on
          ? (
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
            )
          : <span className={text}>{originText}</span>}
      </td>
      <td className={cn(TD, 'relative')} onClick={on || !chosen ? undefined : () => onOpen('entry')}>
        {on && typed
          ? (
              <input
                ref={input}
                aria-label={`${nr} ${raw}`}
                value={binding.source === 'fixed' ? binding.value : ''}
                placeholder={raw}
                spellCheck={false}
                onChange={(e) => onType(e.currentTarget.value)}
                onKeyDown={onKey}
                className={cn(INPUT, 'placeholder:font-mono placeholder:text-dense placeholder:text-muted/60')}
              />
            )
          : on && chosen
            ? (
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
              )
            : entry === ''
              ? <span className={cn(text, 'font-mono text-dense opacity-40')}>{raw}</span>
              : <span className={text}>{entry}</span>}
        {on && onRemove && (
          <button
            type="button"
            aria-label={`Stelle ${nr} entfernen`}
            title="Stelle entfernen"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="absolute inset-y-0 right-0 flex items-center px-[8px] text-muted hover:text-error"
          >
            <Trash2 size={13} />
          </button>
        )}
      </td>
    </tr>
  )
}
