import { createContext, useContext, useState, type DragEvent } from 'react'
import { blockType } from '../../../core/block/registry'
import { Subject } from '../../state/Subject'
import type { useEditor } from '../../state/useEditor'
import { useStoreSelect } from '../../state/useStoreSelect'
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

function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.parentId === b.parentId && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.free === b.free
}

// What the canvas shows while something is dragged: the block carried by
// the pointer and its offset, and the ghost of where a drop would land. A
// store of its own, held by the canvas: a move draws only what reads the
// part that moved (useDndSelect), not the whole canvas.
class DndState {
  private _dragId: string | null = null
  private _dropTarget: DropTarget | null = null
  private _dragOffset: DragOffset | null = null
  private readonly subject = new Subject()

  get dragId(): string | null {
    return this._dragId
  }

  get dropTarget(): DropTarget | null {
    return this._dropTarget
  }

  get dragOffset(): DragOffset | null {
    return this._dragOffset
  }

  subscribe(listener: () => void): () => void {
    return this.subject.subscribe(listener)
  }

  setDragId(id: string | null): void {
    if (id === this._dragId) return
    this._dragId = id
    this.subject.notify()
  }

  // The same place again keeps the ghost as it is.
  setDropTarget(target: DropTarget | null): void {
    if (sameTarget(this._dropTarget, target)) return
    this._dropTarget = target
    this.subject.notify()
  }

  setDragOffset(offset: DragOffset | null): void {
    this._dragOffset = offset
    this.subject.notify()
  }

  reset(): void {
    if (this._dragId === null && this._dropTarget === null && this._dragOffset === null) return
    this._dragId = null
    this._dropTarget = null
    this._dragOffset = null
    this.subject.notify()
  }
}

const DndContext = createContext<DndState | null>(null)

function useDnd(): DndState {
  const dnd = useContext(DndContext)
  if (!dnd) throw new Error('DndContext fehlt (nur innerhalb des Canvas nutzbar)')
  return dnd
}

// The store behind DndContext, held by the canvas.
function useDndState(): DndState {
  return useState(() => new DndState())[0]
}

// A part of the drag state; the component draws again only when it changes.
function useDndSelect<T>(select: (dnd: DndState) => T): T {
  return useStoreSelect(useDnd(), select)
}

function commitDrop(e: DragEvent, ed: ReturnType<typeof useEditor>, dnd: DndState): void {
  const target = dnd.dropTarget
  if (target && target.free && isNewBlockDrag(e.dataTransfer)) {
    const type = e.dataTransfer.getData(NEW_BLOCK_MIME)
    if (blockType(type)) ed.addBlockAtCell(type, target.parentId, target.x, target.y)
  }
  dnd.reset()
}

export type { DndState, DropTarget }
export { commitDrop, DndContext, useDnd, useDndSelect, useDndState }
