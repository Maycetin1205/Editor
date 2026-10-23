import type { ReactNode } from 'react'
import { Check } from '@/editor/icons/icon'
import { cn } from './cn'

export function DoneLabel({ done, icon, label, doneLabel, labelClassName }: {
  done: boolean
  icon: ReactNode
  label: string
  doneLabel: string
  labelClassName?: string
}) {
  return (
    <span className="grid">
      <span className={cn('col-start-1 row-start-1 inline-flex items-center gap-[6px]', done && 'invisible')}>
        {icon} <span className={labelClassName}>{label}</span>
      </span>
      <span className={cn('col-start-1 row-start-1 inline-flex items-center gap-[6px]', !done && 'invisible')}>
        <Check size={14} /> <span className={labelClassName}>{doneLabel}</span>
      </span>
    </span>
  )
}
