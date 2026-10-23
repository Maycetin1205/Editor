import type { ReactNode, RefObject } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { List, type ListGroup } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'

export function ChoiceCell({
  label,
  on,
  open,
  groups,
  value,
  cellRef,
  wrap = false,
  onOpen,
  onChoose,
}: {
  label: ReactNode
  on: boolean
  open: boolean
  groups: () => ListGroup[]
  value: string
  cellRef: RefObject<HTMLButtonElement | null>
  wrap?: boolean
  onOpen: (open: boolean) => void
  onChoose: (value: string) => void
}) {
  return (
    <>
      <button
        ref={cellRef}
        type="button"
        tabIndex={on ? 0 : -1}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          onOpen(!open)
        }}
        className={cn(
          'flex w-full min-w-0 items-center gap-[6px] px-[10px] text-left outline-none',
          wrap ? 'min-h-[28px] py-[5px]' : 'h-[28px]',
        )}
      >
        <span className={cn('min-w-0 flex-1', wrap ? 'break-words' : 'truncate')}>{label}</span>
        {on && <ChevronDown size={13} aria-hidden className="shrink-0 opacity-80" />}
      </button>
      {open && (
        <Popover name="Wahl" anchor={cellRef} width={280} level={70} onClose={() => onOpen(false)}>
          <List searchable groups={groups()} value={value} wrap={wrap} onChoose={onChoose} />
        </Popover>
      )}
    </>
  )
}
