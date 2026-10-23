import { useState } from 'react'
import { ChevronDown, ChevronUp } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import type { Property } from '../../core/block/property'
import { narrow } from './narrow'

interface LadderControlProps {
  property: Property<unknown>
  value: string
  onChange: (value: string) => void
}

const STEP =
  'flex h-full shrink-0 items-center justify-center rounded-[var(--radius-small)] px-[5px] text-muted transition-colors'
  + ' hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-[.45] disabled:hover:bg-transparent'

export function LadderControl({ property, value, onChange }: LadderControlProps) {
  const name = property.label
  const steps = (property.type.options ?? []).map((o) => Number(o.value))
  const current = Number(value)
  const above = (n: number): number | undefined => steps.find((s) => s > n)
  const below = (n: number): number | undefined => steps.findLast((s) => s < n)
  const up = above(current)
  const down = below(current)

  const [draft, setDraft] = useState(value)
  const [base, setBase] = useState(value)
  if (base !== value) {
    setBase(value)
    setDraft(value)
  }

  const typed = (): number => {
    const n = Number.parseFloat(draft.replace(',', '.'))
    return Number.isFinite(n) ? narrow(Math.round(n), property) : current
  }
  const send = (n: number): void => {
    setDraft(String(n))
    if (String(n) !== value) onChange(String(n))
  }

  return (
    <div
      className={cn(
        'flex h-control w-fit items-center gap-[2px] rounded border border-line bg-panel p-[2px]',
        'focus-within:border-accent focus-within:shadow-focus',
      )}
    >
      <input
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={name}
        aria-valuenow={current}
        aria-valuemin={property.min}
        aria-valuemax={property.max}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={() => send(typed())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            send(typed())
          } else if (e.key === 'Escape') {
            setDraft(value)
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const from = typed()
            send((e.key === 'ArrowUp' ? above(from) : below(from)) ?? from)
          }
        }}
        className="w-10 min-w-0 bg-transparent px-[6px] text-center text-ui font-semibold tabular-nums text-ink outline-none"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${name} größer`}
        title="Größer"
        disabled={up === undefined}
        onClick={() => up !== undefined && send(up)}
        className={STEP}
      >
        <ChevronUp size={14} aria-hidden />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${name} kleiner`}
        title="Kleiner"
        disabled={down === undefined}
        onClick={() => down !== undefined && send(down)}
        className={STEP}
      >
        <ChevronDown size={14} aria-hidden />
      </button>
    </div>
  )
}
