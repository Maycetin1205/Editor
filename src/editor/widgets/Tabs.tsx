import type { ReactNode } from 'react'
import { cn } from './cn'

interface TabsProps {
  active?: boolean
  onClick: () => void
  onDoubleClick?: () => void
  title?: string
  className?: string
  children: ReactNode
}

export function Tabs({ active = false, onClick, onDoubleClick, title, className, children }: TabsProps) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        'h-[43px] max-w-48 shrink-0 truncate px-[12px] text-ui font-bold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
        active ? 'text-ink shadow-tab' : 'text-muted hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
