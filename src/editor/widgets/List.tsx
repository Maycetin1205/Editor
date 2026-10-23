import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Search } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Badge } from './Badge'
import { LINE_CHOSEN, LINE_HOVER } from './lineLook'

interface ListEntry {
  value: string
  name: string

  badge?: string
  disabled?: boolean
}

export interface ListGroup {
  key: string
  name?: string
  badge?: string
  entries: readonly ListEntry[]
}

interface ListProps {
  groups: readonly ListGroup[]
  value: string

  values?: readonly string[]

  emptyText?: string

  searchable?: boolean

  fill?: boolean
  wrap?: boolean
  onChoose: (value: string) => void
}

const ROW = 'flex w-full items-baseline gap-[8px] rounded-[var(--radius-small)] px-[9px] py-[6px] text-left text-ui font-semibold transition-colors'

function fits(text: string, search: string): boolean {
  return text.toLowerCase().includes(search)
}

export function List({
  groups,
  value,
  values,
  emptyText,
  searchable = false,
  fill = false,
  wrap = false,
  onChoose,
}: ListProps) {
  const text = cn('min-w-0', !wrap && 'truncate')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement | null>(null)
  const rowsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (searchable) searchRef.current?.focus()
  }, [searchable])

  const wanted = search.trim().toLowerCase()

  const choices = (): HTMLButtonElement[] => [
    ...(rowsRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
  ]

  const step = (from: EventTarget | null, by: 1 | -1): void => {
    const all = choices()
    const at = from instanceof HTMLButtonElement ? all.indexOf(from) : -1
    const next = at === -1 ? (by === 1 ? all[0] : all.at(-1)) : all[at + by]
    if (next) {
      next.focus()
      next.scrollIntoView({ block: 'nearest' })
    } else if (by === -1) {
      searchRef.current?.focus()
    }
  }

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      step(null, 1)
    }
    if (e.key === 'Enter' && wanted !== '') {
      e.preventDefault()
      const all = choices()
      if (all.length === 1) all[0].click()
      else step(null, 1)
    }
  }

  const onRowsKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    e.stopPropagation()
    step(e.target, e.key === 'ArrowDown' ? 1 : -1)
  }

  const filtered = useMemo(() => {
    if (wanted === '') return groups
    return groups
      .map((g) => ({
        ...g,
        entries: g.entries.filter((e) => fits(e.name, wanted) || fits(e.badge ?? '', wanted)),
      }))
      .filter((g) => g.entries.length > 0)
  }, [groups, wanted])

  return (
    <div className={cn('flex flex-col', fill && 'min-h-0 flex-1')}>
      {searchable && (
        <div className="mb-[4px] flex shrink-0 items-center gap-[6px] rounded border border-transparent bg-control px-[9px] transition-colors focus-within:border-accent focus-within:bg-panel focus-within:shadow-focus">
          <Search size={13} aria-hidden className="shrink-0 text-muted" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            onKeyDown={onSearchKey}
            placeholder="Suchen…"
            aria-label="Suchen"
            className="h-control min-w-0 flex-1 bg-transparent text-ui font-semibold text-ink outline-none placeholder:text-muted"
          />
        </div>
      )}

      <div ref={rowsRef} onKeyDown={onRowsKey} className={cn('flex flex-col', fill && 'min-h-0 flex-1 overflow-y-auto')}>
      {emptyText !== undefined && wanted === '' && (
        <button
          type="button"
          onClick={() => onChoose('')}
          className={cn(ROW, 'text-muted hover:text-ink', LINE_HOVER, value === '' && LINE_CHOSEN)}
        >
          <span className="w-[12px] shrink-0 text-accent">{value === '' && <Check size={12} />}</span>
          <span className={cn(text, 'flex-1')}>{emptyText}</span>
        </button>
      )}

      {filtered.map((g) => (
        <div key={g.key} className="flex flex-col">
          {g.name !== undefined && g.name !== '' && (
            <p className="flex items-baseline gap-[8px] px-[9px] pb-[2px] pt-[8px] text-dense font-semibold text-muted">
              <span className={text}>{g.name}</span>
              {g.badge !== undefined && g.badge !== '' && (
                <Badge className="font-normal">{g.badge}</Badge>
              )}
            </p>
          )}
          {g.entries.map((e) => {
            const chosen = values ? values.includes(e.value) : e.value === value
            return (
              <button
                key={`${g.key}::${e.value}`}
                type="button"
                disabled={e.disabled}
                onClick={() => onChoose(e.value)}
                className={cn(
                  ROW,
                  e.disabled
                    ? 'cursor-not-allowed text-muted opacity-[.45]'
                    : cn('text-ink', LINE_HOVER),
                  chosen && LINE_CHOSEN,
                )}
              >
                <span className="w-[12px] shrink-0 text-accent">
                  {chosen && <Check size={12} />}
                </span>
                {wrap
                  ? (
                      <span className="min-w-0 flex-1">
                        {e.name}
                        {e.badge !== undefined && e.badge !== '' && (
                          <span className="block break-all font-mono text-dense text-muted">{e.badge}</span>
                        )}
                      </span>
                    )
                  : (
                      <>
                        <span className="min-w-0 flex-1 truncate">{e.name}</span>
                        {e.badge !== undefined && e.badge !== '' && (
                          <Badge className="max-w-[50%]">{e.badge}</Badge>
                        )}
                      </>
                    )}
              </button>
            )
          })}
        </div>
      ))}
      </div>
    </div>
  )
}
