import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { GRID, gridSlotRead, gridMetricsOf, type GridSlot } from '../../core/block/grid'
import { columnsOf, freeRowOn, isGridArea, usedColumnsOn } from '../../core/block/gridArea'
import type { EditorStore } from '../state/EditorStore'
import { areaOf, heightInBox, capacityOf, rowsCapacity } from './gridArea'
import { swallowNextClick, type PointerDrag } from './pointerDrag'
import { cellFromPointer } from './gridDnd'
import { cssZoomOf } from '../../blocks/base/cssZoom'

export type Edge = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw'

export const GRIPS: readonly Edge[] = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']

const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(value, Math.max(low, high)))

const sameSlot = (a: GridSlot, b: GridSlot): boolean => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h

// No smaller than the block allows, and large enough for what it holds.
function leastSize(editor: EditorStore, node: BlockNode, h: number): { w: number; h: number } {
  const spec = gridMetricsOf(blockType(node.type))
  const own = capacityOf(editor.tree, node.id)
  const rows = own === null ? 0 : freeRowOn(editor.tree, node.id) + h - own
  const columns = isGridArea(node) ? usedColumnsOn(editor.tree, node.id) : 0
  return { w: Math.max(1, spec.minWidth, columns), h: Math.max(1, spec.minHeight, rows) }
}

interface SlotLimits {
  edge: Edge
  start: GridSlot
  capacity: number | null
  least: { w: number; h: number }
}

// The slot when the grip has moved `dx` columns and stands on `row`, in an
// area of `columns` columns.
function slotAt({ edge, start, capacity, least }: SlotLimits, columns: number, dx: number, row: number): GridSlot {
  let { x, y, w, h } = start
  if (edge.includes('e')) w = clamp(start.w + dx, least.w, columns - start.x)
  if (edge.includes('w')) {
    x = clamp(start.x + dx, 0, start.x + start.w - least.w)
    w = start.w + start.x - x
  }
  if (edge.includes('s')) h = heightInBox(capacity, start.y, Math.max(least.h, row - start.y + 1))
  if (edge.includes('n')) {
    y = clamp(row, 0, start.y + start.h - least.h)
    h = start.h + start.y - y
  }
  return { x, y, w, h }
}

// Resizes a block in its grid area at one grip. Every changed slot is written
// right away, all of them under one undo step. An end without a drop keeps
// the slot reached so far, as on a lost pointer.
function gridSizeDrag(
  editor: EditorStore,
  blockRef: RefObject<BlockNode>,
  el: HTMLElement,
  e: ReactPointerEvent<HTMLElement>,
  edge: Edge,
): PointerDrag {
  e.preventDefault()
  e.stopPropagation()

  const node = blockRef.current
  const start = gridSlotRead(node.values)
  const zoom = cssZoomOf(el)
  const stepX = (el.getBoundingClientRect().width / zoom + GRID.gapPx) / start.w

  const area = el.parentElement ? areaOf(el.parentElement) : null
  const capacity = area && node.parentId ? rowsCapacity(editor.tree, node.parentId, area) : null
  const limits: SlotLimits = { edge, start, capacity, least: leastSize(editor, node, start.h) }

  const grabRow = edge.includes('s') ? start.y + start.h - 1 : start.y
  const rowAt = (ev: PointerEvent): number =>
    area
      ? cellFromPointer(area, ev.clientX, ev.clientY).y
      : grabRow + Math.round((ev.clientY - e.clientY) / zoom / (GRID.rowPx + GRID.gapPx))

  const bracket = editor.openGesture()
  let last = start
  return {
    move: (ev) => {
      const next = slotAt(
        limits,
        columnsOf(editor.tree, node.parentId),
        Math.round((ev.clientX - e.clientX) / zoom / stepX),
        edge.includes('n') || edge.includes('s') ? rowAt(ev) : grabRow,
      )
      if (sameSlot(next, last)) return
      last = next
      bracket.open()
      editor.resizeNodeToSlot(blockRef.current.id, next)
    },
    drop: () => {
      bracket.close()
      if (last !== start) swallowNextClick()
    },
    cancel: () => bracket.close(),
  }
}

export function useBlockResize(
  editor: EditorStore,
  blockRef: RefObject<BlockNode>,
  rootRef: RefObject<HTMLElement | null>,
) {
  function gridResize(e: ReactPointerEvent<HTMLElement>, edge: Edge): PointerDrag | null {
    const el = rootRef.current
    return el ? gridSizeDrag(editor, blockRef, el, e, edge) : null
  }

  function resetGridSize(edge: Edge) {
    const node = blockRef.current
    const slot = gridSlotRead(node.values)
    const spec = gridMetricsOf(blockType(node.type))
    const least = leastSize(editor, node, slot.h)
    editor.resizeNodeToSlot(node.id, {
      ...slot,
      ...(edge.includes('e') || edge.includes('w') ? { w: Math.max(spec.startWidth, least.w) } : {}),
      ...(edge.includes('n') || edge.includes('s') ? { h: Math.max(spec.startHeight, least.h) } : {}),
    })
  }

  return { gridResize, resetGridSize }
}
