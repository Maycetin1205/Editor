import { useState, type ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from '@/editor/widgets/Field'
import { NAME } from '@/editor/widgets/Grid'

// The height of every control in the settings bar of a source.
export const PICKER = 'h-[28px]'

// One setting of the bar: its name, then its control.
export function Setting({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-[8px]">
      <span className={cn(NAME, 'shrink-0')}>{name}</span>
      {children}
    </div>
  )
}

// A short text saved on Enter or when the focus leaves, and only when valid.
export function TextCell({
  name,
  value,
  valid,
  onSave,
}: {
  name: string
  value: string
  valid: (text: string) => boolean
  onSave: (text: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? value
  const ok = valid(text)
  const commit = () => {
    if (draft !== null && ok && draft !== value) onSave(draft)
    setDraft(null)
  }
  return (
    <input
      aria-label={name}
      value={text}
      spellCheck={false}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
          e.currentTarget.blur()
        }
      }}
      onBlur={commit}
      className={cn(INPUT_EDGE, PICKER, 'w-[110px] px-[8px] font-mono', ok ? 'text-ink' : 'text-error')}
    />
  )
}
