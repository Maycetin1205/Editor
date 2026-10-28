import { useContext, type ReactNode } from 'react'
import { cn } from '../widgets/cn'
import { Tile } from '../widgets/Tile'
import { TickBox } from '../widgets/TickBox'
import { LabelsShown } from './labelsShown'

// A control that cannot shrink, like a segment of words, moves under its
// label when the line is too narrow for both.
export function Labeled({
  label,
  detail = '',
  fixedWidth = false,
  children,
}: {
  label: string
  detail?: string
  fixedWidth?: boolean
  children: ReactNode
}) {
  if (!useContext(LabelsShown)) return <>{children}</>
  return (
    <span
      className={cn(
        'min-h-[36px] w-full min-w-0 items-center gap-x-[12px] py-[2px]',
        fixedWidth ? 'flex flex-wrap gap-y-[4px]' : 'grid grid-cols-[132px_minmax(0,1fr)]',
      )}
    >
      <span className={cn('break-words text-dense font-semibold leading-tight text-muted', fixedWidth && 'w-[132px]')}>
        {label}
      </span>
      <span className={cn('flex items-center gap-[6px]', fixedWidth ? 'min-w-fit flex-1' : 'min-w-0')}>
        {detail !== '' && <span className="shrink-0 font-semibold text-ink">{detail}</span>}
        {children}
      </span>
    </span>
  )
}

export function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: (on: boolean) => void }) {
  if (!useContext(LabelsShown)) return <Tile label={label} on={on} onToggle={onToggle} />
  return (
    <label
      data-switch
      className="flex h-[24px] shrink-0 cursor-pointer items-center gap-[8px] text-ui font-semibold text-ink"
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={on}
        onChange={(e) => onToggle(e.currentTarget.checked)}
      />
      <TickBox
        on={on}
        className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      />
      {label}
    </label>
  )
}
