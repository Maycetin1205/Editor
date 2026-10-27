import type { ReactNode } from 'react'
import { cn } from './cn'

// The heading strip over a table or a block of settings, with room on the
// right for a count or buttons.
export function Strip({ children, right, wrap = false }: { children: ReactNode; right?: ReactNode; wrap?: boolean }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-[8px] border-b border-line-soft bg-panel px-[12px] text-ui font-bold text-ink',
        wrap ? 'min-h-[36px] py-[8px]' : 'h-[36px]',
      )}
    >
      <span className={cn('flex min-w-0 items-center gap-[8px]', !wrap && 'truncate')}>{children}</span>
      {right !== undefined && (
        <span className="ml-auto flex shrink-0 items-center gap-[6px] text-dense font-semibold text-muted">
          {right}
        </span>
      )}
    </div>
  )
}

// A block of settings under a strip, and the names in it.
export const SETTINGS = 'grid items-center gap-[8px] border-b border-line-soft px-[12px] py-[8px]'
export const NAME = 'text-dense font-semibold text-muted'
// A field that sits in a strip.
export const STRIP_FIELD = 'h-[28px] w-[260px]'
