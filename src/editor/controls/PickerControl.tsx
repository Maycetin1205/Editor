import { useRef, useState } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { List, type ListGroup } from '@/editor/widgets/List'
import { POPOVER_WIDTH, Popover } from '@/editor/widgets/Popover'
import { Row } from '@/editor/widgets/Row'

interface PickerControlProps {
  label?: string

  name: string
  groups: readonly ListGroup[]
  value: string

  emptyText?: string
  wrap?: boolean
  className?: string
  onChoose: (value: string) => void
}

const TICK_ROOM = 40
const WINDOW_EDGE = 12

function menuWidth(button: HTMLElement | null): number | undefined {
  if (!button) return undefined
  const own = button.getBoundingClientRect()
  const around = button.closest('[data-ff-popover-family]')?.getBoundingClientRect()
  const room = (around?.right ?? window.innerWidth) - WINDOW_EDGE - own.left
  return Math.min(Math.max(POPOVER_WIDTH, own.width + TICK_ROOM), room)
}

export function PickerControl({
  label,
  name,
  groups,
  value,
  emptyText,
  wrap = false,
  className,
  onChoose,
}: PickerControlProps) {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState<number | undefined>(undefined)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const hit = groups.flatMap((g) => g.entries).find((e) => e.value === value)

  const shown = hit?.name ?? (value === '' ? emptyText ?? '' : '')

  const button = (id?: string) => (
    <Button
      ref={buttonRef}
      id={id}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label === undefined ? `${name}: ${shown}` : undefined}
      onClick={() => {
        if (!open && wrap) setWidth(menuWidth(buttonRef.current))
        setOpen(!open)
      }}
      className={cn(INPUT_EDGE, 'flex h-control items-center gap-2 px-2 text-left focus-visible:ring-0', className)}
    >
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          value === '' && 'text-muted',
          hit !== undefined && 'font-medium',
        )}
      >
        {shown}
      </span>
      <ChevronDown size={13} aria-hidden className="shrink-0 text-muted" />
    </Button>
  )

  return (
    <>
      {label === undefined
        ? button()
        : <Row label={label}>{(id) => button(id)}</Row>}

      {open && (
        <Popover
          name={name}
          anchor={buttonRef}
          width={wrap ? width : undefined}
          onClose={() => setOpen(false)}
        >
          <List
            searchable
            groups={groups}
            value={value}
            emptyText={emptyText}
            wrap={wrap}
            onChoose={(v) => {
              onChoose(v)
              setOpen(false)
            }}
          />
        </Popover>
      )}
    </>
  )
}
