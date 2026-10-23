import { cn } from './cn'

export const LINE_HOVER = 'hover:bg-hover'
export const LINE_CHOSEN = 'bg-accent-soft text-ink shadow-mark hover:bg-accent-soft'
export const ROW_CHOSEN = 'bg-accent-soft text-ink [&>td:first-child]:shadow-mark'

export const binArea = (marked: boolean): string => cn(
  'absolute inset-y-0 right-0 items-center px-[8px] text-muted hover:text-error',
  marked ? 'flex bg-accent-soft' : 'hidden bg-hover group-hover:flex',
)
