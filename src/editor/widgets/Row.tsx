import { useId, type ReactNode } from 'react'

interface RowProps {
  label?: ReactNode
  children: (id: string) => ReactNode
}

export function Row({ label, children }: RowProps) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-[2px]">
      {label !== undefined && (
        <label htmlFor={id} className="text-dense font-semibold leading-tight text-muted">
          {label}
        </label>
      )}
      <div className="flex min-w-0 flex-col">{children(id)}</div>
    </div>
  )
}
