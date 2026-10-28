import { useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { cssZoomOf } from '../../../blocks/base/cssZoom'
import type { Frame, HeadPlace } from '../../../blocks/base/headsReport'
import type { ListBinding } from '../../../core/block/blockType'
import type { BlockNode } from '../../../core/block/tree'
import type { EditorStore } from '../../state/EditorStore'
import { usePointerDrag, type PointerDrag } from '../drag/pointerDrag'

const DRAG_THRESHOLD = 5

// Where a head starts and how long it is, along the row or down the column.
export const startOf = (s: Frame, down: boolean): number => (down ? s.top : s.left)
export const lengthOf = (s: Frame, down: boolean): number => (down ? s.height : s.width)

// The head being dragged and the gap it would drop into.
export interface HeadDragShown {
  from: number
  slot: number
}

interface HeadDragArgs {
  editor: EditorStore
  block: BlockNode
  binding: ListBinding
  entries: readonly unknown[]
  // Every head the element reports, also inner and lower ones.
  spots: readonly HeadPlace[]
  // The heads of the entries themselves, in their order.
  heads: readonly HeadPlace[]
  host: RefObject<HTMLElement | null>
  clickHead: (index: number, wasSelected: boolean) => void
}

function headDrag(
  { editor, block, binding, entries, spots, heads, clickHead }: HeadDragArgs,
  index: number,
  e: ReactPointerEvent<HTMLElement>,
  frame: HTMLElement,
  show: (shown: HeadDragShown | null) => void,
): PointerDrag {
  const down = binding.entriesDown === true
  const wasSelected = editor.selectedId === block.id
  // Inner and lower heads only take clicks.
  const stays = spots[index]?.path.inner !== undefined || spots[index]?.below === true
  const pointerAt = (ev: { clientX: number; clientY: number }): number => (down ? ev.clientY : ev.clientX)
  const startAt = pointerAt(e)
  const reference = frame.getBoundingClientRect()
  const referenceStart = down ? reference.top : reference.left
  const zoom = cssZoomOf(frame)
  const midway = heads.map((s) => referenceStart + (startOf(s, down) + lengthOf(s, down) / 2) * zoom)
  const slotOf = (at: number): number => {
    for (let i = 0; i < midway.length; i++) if (at < midway[i]) return i
    return midway.length
  }
  let dragging = false
  let slot = index
  const end = (): void => {
    if (dragging) document.body.style.cursor = ''
    show(null)
  }

  return {
    starts: (ev) => !stays && Math.abs(pointerAt(ev) - startAt) >= DRAG_THRESHOLD,
    begin: () => {
      dragging = true
      document.body.style.cursor = 'grabbing'
    },
    move: (ev) => {
      ev.preventDefault()
      slot = slotOf(pointerAt(ev))
      show({ from: index, slot })
    },
    drop: () => {
      end()
      if (binding.entryMove === undefined) return
      const of = spots[index]?.path.index ?? index
      const toRaw = heads[slot]?.path.index ?? (heads[heads.length - 1]?.path.index ?? 0) + 1
      const next = binding.entryMove(entries, of, toRaw > of ? toRaw - 1 : toRaw)
      if (next !== null) editor.updateProperty(block.id, binding.prop, next)
    },
    click: () => {
      end()
      clickHead(index, wasSelected)
    },
    cancel: end,
  }
}

// Reorders the entries of a list by dragging a head. Nothing is written
// before the drop; until then a line shows the gap. A press without a drag
// is a click on the head.
export function useHeadDrag(args: HeadDragArgs): {
  shown: HeadDragShown | null
  press: (index: number, e: ReactPointerEvent<HTMLElement>) => void
} {
  const [shown, setShown] = useState<HeadDragShown | null>(null)
  const drag = usePointerDrag()
  const press = (index: number, e: ReactPointerEvent<HTMLElement>): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    const frame = args.host.current
    if (!frame) return
    drag(e, headDrag(args, index, e, frame, setShown))
  }
  return { shown, press }
}
