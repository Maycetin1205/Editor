import type { DragEvent } from 'react'
import { mayContain, blockType } from '../../../core/block/registry'
import { GRID, gridMetricsOf } from '../../../core/block/grid'
import type { useEditor } from '../../state/useEditor'
import { isNewBlockDrag, newBlockDragType } from './dnd'
import { commitDrop, type DndState, type DropTarget } from './dndState'
import { columnsOf, slotTaken } from '../../../core/block/gridArea'
import { areaUnderPointer, rowsCapacity, rowInBox } from '../gridArea'
import { cssZoomOf } from '../../../blocks/base/cssZoom'

export function cellFromPointer(gridEl: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
  const style = getComputedStyle(gridEl)
  const rect = gridEl.getBoundingClientRect()
  const padL = parseFloat(style.paddingLeft) || 0
  const padT = parseFloat(style.paddingTop) || 0
  const columnsGap = parseFloat(style.columnGap) || GRID.gapPx
  const rowsGap = parseFloat(style.rowGap) || GRID.gapPx

  const zoom = cssZoomOf(gridEl)
  const lx = (clientX - rect.left) / zoom - padL + gridEl.scrollLeft
  const ly = (clientY - rect.top) / zoom - padT + gridEl.scrollTop

  const columns = style.gridTemplateColumns
    .split(' ')
    .map((t) => parseFloat(t))
    .filter((n) => Number.isFinite(n))
  let x = 0
  let edgeX = 0
  while (x < columns.length) {
    if (lx < edgeX + columns[x]) break
    edgeX += columns[x] + columnsGap
    x++
  }
  x = Math.max(0, Math.min(columns.length - 1, x))

  const tracks = style.gridTemplateRows
    .split(' ')
    .map((t) => parseFloat(t))
    .filter((n) => Number.isFinite(n))
  let y = 0
  let edge = 0
  while (y < tracks.length) {
    if (ly < edge + tracks[y]) break
    edge += tracks[y] + rowsGap
    y++
  }
  if (y >= tracks.length) {
    const pitch = GRID.rowPx + rowsGap
    y = tracks.length + (pitch > 0 ? Math.max(0, Math.floor((ly - edge) / pitch)) : 0)
  }
  return { x, y: Math.max(0, y) }
}

function draggedSize(
  ed: ReturnType<typeof useEditor>,
  dt: DataTransfer,
  parentId: string,
): { w: number; h: number } | null {
  const parent = ed.getNode(parentId)
  if (!parent) return null
  const type = newBlockDragType(dt)
  const def = type ? blockType(type) : undefined
  if (!type || !def || !mayContain(parent.type, type)) return null
  const spec = gridMetricsOf(def)
  return { w: spec.startWidth, h: spec.startHeight }
}

function gridTarget(
  e: DragEvent,
  ed: ReturnType<typeof useEditor>,
  parentId: string,
  gridEl: HTMLElement,
): DropTarget | null {
  const size = draggedSize(ed, e.dataTransfer, parentId)
  if (!size) return null
  const cell = cellFromPointer(gridEl, e.clientX, e.clientY)
  const columns = columnsOf(ed.tree, parentId)
  const w = Math.min(size.w, columns)
  const x = Math.max(0, Math.min(cell.x, columns - w))
  const capacity = rowsCapacity(ed.tree, parentId, gridEl)
  const y = rowInBox(capacity, cell.y, size.h)
  const free = !slotTaken(ed.tree, parentId, { x, y, w, h: size.h }, null)
  return { parentId, x, y, w, h: size.h, free }
}

// Dropping a new block from the palette onto a page, with the browser's own
// drag and drop: the drag starts outside the canvas and carries its block
// type in the DataTransfer. `on` false lets the page ignore the drag.
export function pageDrop(ed: ReturnType<typeof useEditor>, dnd: DndState, pageId: string, on = true) {
  return {
    onDragOver: (e: DragEvent) => {
      if (!on || !isNewBlockDrag(e.dataTransfer)) return
      const target = areaUnderPointer(ed.tree, pageId, e.clientX, e.clientY)
      if (!target) {
        dnd.setDropTarget(null)
        return
      }
      e.preventDefault()
      dnd.setDropTarget(gridTarget(e, ed, target.parentId, target.area))
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) dnd.setDropTarget(null)
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      commitDrop(e, ed, dnd)
    },
  }
}
