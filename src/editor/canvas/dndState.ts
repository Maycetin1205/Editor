import { createContext, useCallback, useContext, useMemo, useState, type DragEvent } from 'react'
import { blockType } from '../../core/block/registry'
import type { useEditor } from '../state/useEditor'
import { isNewBlockDrag, NEW_BLOCK_MIME } from './dnd'

interface DropTarget {
  parentId: string
  x: number
  y: number
  w: number
  h: number
  free: boolean
}

interface DragOffset {
  dx: number
  dy: number
}

// What the canvas shows while something is dragged: the block carried by
// the pointer and its offset, and the ghost of where a drop would land.
interface DndState {
  dragId: string | null
  dropTarget: DropTarget | null
  dragOffset: DragOffset | null
  setDragId: (id: string | null) => void
  setDropTarget: (t: DropTarget | null) => void
  setDragOffset: (o: DragOffset | null) => void
  reset: () => void
}

function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.parentId === b.parentId && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.free === b.free
}

const DndContext = createContext<DndState | null>(null)

function useDnd(): DndState {
  const dnd = useContext(DndContext)
  if (!dnd) throw new Error('DndContext fehlt (nur innerhalb des Canvas nutzbar)')
  return dnd
}

// The state behind DndContext, held by the canvas.
function useDndState(): DndState {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, rememberDropTarget] = useState<DropTarget | null>(null)
  const [dragOffset, setDragOffset] = useState<DragOffset | null>(null)

  // The same place again keeps the ghost as it is.
  const setDropTarget = useCallback((target: DropTarget | null) => {
    rememberDropTarget((before) => (sameTarget(before, target) ? before : target))
  }, [])

  return useMemo<DndState>(
    () => ({
      dragId,
      dropTarget,
      dragOffset,
      setDragId,
      setDropTarget,
      setDragOffset,
      reset: () => {
        setDragId(null)
        setDropTarget(null)
        setDragOffset(null)
      },
    }),
    [dragId, dropTarget, dragOffset, setDropTarget],
  )
}

function commitDrop(e: DragEvent, ed: ReturnType<typeof useEditor>, dnd: DndState): void {
  const target = dnd.dropTarget
  if (target && target.free) {
    if (dnd.dragId !== null) {
      ed.moveNodeToCell(dnd.dragId, target.parentId, target.x, target.y)
    } else if (isNewBlockDrag(e.dataTransfer)) {
      const type = e.dataTransfer.getData(NEW_BLOCK_MIME)
      if (blockType(type)) ed.addBlockAtCell(type, target.parentId, target.x, target.y)
    }
  }
  dnd.reset()
}

export type { DndState, DropTarget }
export { commitDrop, DndContext, useDnd, useDndState }
