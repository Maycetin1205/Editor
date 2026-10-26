import { useContext, useRef, useState, type RefObject } from 'react'
import { cn } from './cn'
import { ColumnsOf, leavesLine } from './gridContext'
import { inputClass, TD } from './gridLook'
import { LINE_HOVER } from './lineLook'
import { OnEscape } from './useCloseOnEscape'

interface GridNewLineProps {
  names: readonly string[]
  placeholders?: readonly string[]
  firstRef?: RefObject<HTMLInputElement | null>
  autoFocus?: boolean
  valid: (v: readonly string[]) => boolean
  onAdd: (v: readonly string[]) => boolean
}

// The empty line at the foot of a table: typed in, it adds a line on Enter
// or when the focus leaves it.
export function GridNewLine({ names, placeholders = [], firstRef, autoFocus = false, valid, onAdd }: GridNewLineProps) {
  const columns = useContext(ColumnsOf)
  const empty = columns.map(() => '')
  const [v, setV] = useState<readonly string[]>(empty)
  const ownFirst = useRef<HTMLInputElement>(null)
  const first = firstRef ?? ownFirst
  const typed = v.some((x) => x.trim() !== '')
  const ok = !typed || valid(v)
  const add = (): boolean => {
    if (!typed || !onAdd(v)) return false
    setV(empty)
    return true
  }
  return (
    <tr className={cn(LINE_HOVER, 'focus-within:bg-panel')}>
      {columns.map((c, k) => (
        <td key={k} className={TD}>
          <input
            ref={k === 0 ? first : undefined}
            aria-label={names[k] ?? c.name}
            placeholder={placeholders[k]}
            autoFocus={k === 0 && autoFocus}
            value={v[k] ?? ''}
            spellCheck={false}
            className={inputClass(c, !ok)}
            onChange={(e) => setV(v.map((x, i) => (i === k ? e.currentTarget.value : x)))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && add()) first.current?.focus()
            }}
            onBlur={(e) => {
              if (leavesLine(e)) add()
            }}
          />
        </td>
      ))}
      {typed && <OnEscape run={() => setV(empty)} />}
    </tr>
  )
}
