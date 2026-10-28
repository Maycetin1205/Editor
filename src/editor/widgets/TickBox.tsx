import { Check } from '../icons/icon'
import { cn } from './cn'

export function TickBox({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[var(--radius-small)] border-[1.5px] transition-colors',
        on ? 'border-accent bg-accent text-panel' : 'border-box-line bg-panel',
        className,
      )}
    >
      {on && <Check size={12} strokeWidth={3} />}
    </span>
  )
}
