import { useContext, type ReactNode } from 'react'
import { Tile } from '@/editor/widgets/Tile'
import { TickBox } from '@/editor/widgets/TickBox'
import { LabelsShown } from './labelsShown'

export function Labeled({ label, detail = '', children }: {
  label: string
  detail?: string
  children: ReactNode
}) {
  if (!useContext(LabelsShown)) return <>{children}</>
  return (
    <span className="grid min-h-[36px] w-full min-w-0 grid-cols-[132px_minmax(0,1fr)] items-center gap-x-[12px] py-[2px]">
      <span className="break-words text-dense font-semibold leading-tight text-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-[6px]">
        {detail !== '' && <span className="shrink-0 font-semibold text-ink">{detail}</span>}
        {children}
      </span>
    </span>
  )
}

export function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: (on: boolean) => void }) {
  if (!useContext(LabelsShown)) return <Tile label={label} on={on} onToggle={onToggle} />
  return (
    <label data-switch className="flex h-[24px] shrink-0 cursor-pointer items-center gap-[8px] text-ui font-semibold text-ink">
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
