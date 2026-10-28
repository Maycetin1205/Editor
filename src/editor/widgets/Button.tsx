import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

type ButtonKind = 'primary' | 'silent' | 'command' | 'risk'

const AREA: Record<ButtonKind, string> = {
  primary: 'border border-accent bg-accent text-panel hover:border-accent-ink hover:bg-accent-ink',
  silent: 'border border-line bg-panel text-ink hover:bg-hover',
  command: 'border border-transparent text-ink-2 hover:bg-hover hover:text-ink',
  risk: 'border border-line bg-panel text-error hover:border-error hover:bg-error-soft',
}

const ONLY_ICON: Record<ButtonKind, string> = {
  primary: 'bg-accent text-panel hover:bg-accent-ink',
  silent: 'text-muted hover:bg-hover hover:text-ink',
  command: 'text-muted hover:bg-hover hover:text-ink',
  risk: 'text-muted hover:bg-error-soft hover:text-error',
}

export const PRESSED = 'border-accent bg-accent-soft text-accent hover:bg-accent-soft'

export const OPENER =
  'flex h-control shrink-0 items-center gap-[6px] rounded border border-line bg-panel px-[8px] text-ui font-semibold text-ink transition-colors' +
  ' hover:bg-hover aria-expanded:border-accent aria-expanded:bg-accent-soft' +
  ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

interface ButtonBase extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  kind?: ButtonKind
  children: ReactNode
}

type ButtonProps = ButtonBase & ({ onlyIcon: true; 'aria-label': string } | { onlyIcon?: false })

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ kind = 'silent', onlyIcon = false, className, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-control shrink-0 items-center justify-center gap-[6px] whitespace-nowrap rounded text-ui font-semibold',
        'transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:pointer-events-none disabled:opacity-[.45]',
        onlyIcon ? `w-control ${ONLY_ICON[kind]}` : `px-[12px] ${AREA[kind]}`,
        className,
      )}
      {...rest}
    />
  ),
)
Button.displayName = 'Button'
