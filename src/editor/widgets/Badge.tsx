import type { ReactNode } from 'react'
import { cn } from './cn'

interface BadgeProps {
  children: ReactNode

  technical?: boolean
  className?: string
}

export function Badge({ children, technical = true, className }: BadgeProps) {
  return (
    <span className={cn('min-w-0 shrink-0 truncate text-dense text-muted', technical && 'font-mono', className)}>
      {children}
    </span>
  )
}
