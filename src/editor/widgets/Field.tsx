import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/editor/widgets/cn'

export const INPUT_EDGE =
  'w-full min-w-0 rounded border border-line bg-control text-ui font-semibold text-ink transition-colors' +
  ' placeholder:text-muted' +
  ' focus-visible:border-accent focus-visible:bg-panel focus-visible:shadow-focus focus-visible:outline-none' +
  ' disabled:cursor-not-allowed disabled:opacity-[.45]' +
  ' aria-[invalid=true]:border-error'

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

export const Field = forwardRef<HTMLInputElement, FieldProps>(({ type = 'text', className, ...rest }, ref) => (
  <input ref={ref} type={type} className={cn(INPUT_EDGE, 'h-control px-[10px]', className)} {...rest} />
))
Field.displayName = 'Field'
