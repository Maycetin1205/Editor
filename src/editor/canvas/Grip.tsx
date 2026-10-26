import type { PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/editor/widgets/cn'
import { usePointerDrag, type PointerDrag } from './pointerDrag'
import type { Edge } from './useBlockResize'

const GRIP_PLACE: Record<Edge, string> = {
  n: '-top-[5px] inset-x-[6px] h-[10px] cursor-ns-resize',
  s: '-bottom-[5px] inset-x-[6px] h-[10px] cursor-ns-resize',
  e: '-right-[5px] inset-y-[6px] w-[10px] cursor-ew-resize',
  w: '-left-[5px] inset-y-[6px] w-[10px] cursor-ew-resize',
  ne: '-right-[5px] -top-[5px] h-[10px] w-[10px] cursor-nesw-resize',
  se: '-bottom-[5px] -right-[5px] h-[10px] w-[10px] cursor-nwse-resize',
  sw: '-bottom-[5px] -left-[5px] h-[10px] w-[10px] cursor-nesw-resize',
  nw: '-left-[5px] -top-[5px] h-[10px] w-[10px] cursor-nwse-resize',
}

interface GripProps {
  edge: Edge
  // The drag this press starts, or null for none.
  onDrag: (e: ReactPointerEvent<HTMLDivElement>) => PointerDrag | null
  onReset: () => void
}

// The grip holds its drag: when it leaves the page, the drag ends with it.
export function Grip({ edge, onDrag, onReset }: GripProps) {
  const drag = usePointerDrag()
  return (
    <div
      draggable={false}
      onPointerDown={(e) => drag(e, onDrag(e))}
      onDragStart={(e) => e.preventDefault()}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onReset()
      }}
      className={cn('pointer-events-auto absolute z-30 flex items-center justify-center', GRIP_PLACE[edge])}
    >
      <span className="h-[8px] w-[8px] bg-selection ring-1 ring-panel" />
    </div>
  )
}
