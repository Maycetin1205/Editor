import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { GRID, gridSlotRead, gridMetricsOf, type GridSlot } from '../../core/block/grid'
import { columnsOf, freeRowOn, isGridArea, usedColumnsOn } from '../../core/block/gridArea'
import type { EditorStore } from '../state/EditorStore'
import { areaOf, heightInBox, capacityOf, rowsCapacity } from './gridArea'
import { swallowNextClick } from './dragPosition'
import { cellFromPointer } from './gridDnd'
import { cssZoomOf } from '../../blocks/base/cssZoom'

export type Edge = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw'

export const GRIPS: readonly Edge[] = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(value, Math.max(low, high)))

export function useBlockResize(
  editor: EditorStore,
  blockRef: RefObject<BlockNode>,
  rootRef: RefObject<HTMLElement | null>,
) {
  function leastSize(node: BlockNode, h: number): { w: number; h: number } {
    const spec = gridMetricsOf(blockType(node.type))
    const own = capacityOf(editor.tree, node.id)
    const rows = own === null ? 0 : freeRowOn(editor.tree, node.id) + h - own
    const columns = isGridArea(node) ? usedColumnsOn(editor.tree, node.id) : 0
    return { w: Math.max(1, spec.minWidth, columns), h: Math.max(1, spec.minHeight, rows) }
  }

  function startGridResize(e: ReactPointerEvent<HTMLElement>, edge: Edge) {
    const el = rootRef.current
    if (!el) return
    e.preventDefault()
    e.stopPropagation()

    const node = blockRef.current
    const start = gridSlotRead(node.values)
    const zoom = cssZoomOf(el)
    const rect = el.getBoundingClientRect()
    const stepX = (rect.width / zoom + GRID.gapPx) / start.w

    const area = el.parentElement ? areaOf(el.parentElement) : null
    const capacity = area && node.parentId
      ? rowsCapacity(editor.tree, node.parentId, area)
      : null
    const { w: minW, h: minH } = leastSize(node, start.h)

    const grabRow = edge.includes('s') ? start.y + start.h - 1 : start.y
    const rowAt = (ev: PointerEvent): number => area
      ? cellFromPointer(area, ev.clientX, ev.clientY).y
      : grabRow + Math.round((ev.clientY - e.clientY) / zoom / (GRID.rowPx + GRID.gapPx))

    const slotAt = (dx: number, row: number): GridSlot => {
      let { x, y, w, h } = start
      if (edge.includes('e')) w = clamp(start.w + dx, minW, columnsOf(editor.tree, node.parentId) - start.x)
      if (edge.includes('w')) {
        x = clamp(start.x + dx, 0, start.x + start.w - minW)
        w = start.w + start.x - x
      }
      if (edge.includes('s')) h = heightInBox(capacity, start.y, Math.max(minH, row - start.y + 1))
      if (edge.includes('n')) {
        y = clamp(row, 0, start.y + start.h - minH)
        h = start.h + start.y - y
      }
      return { x, y, w, h }
    }

    const bracket = editor.openGesture()
    let last = start
    const onMove = (ev: PointerEvent) => {
      const next = slotAt(
        Math.round((ev.clientX - e.clientX) / zoom / stepX),
        edge.includes('n') || edge.includes('s') ? rowAt(ev) : grabRow,
      )
      if (next.x === last.x && next.y === last.y && next.w === last.w && next.h === last.h) return
      last = next
      bracket.open()
      editor.resizeNodeToSlot(blockRef.current.id, next)
    }
    const finish = () => {
      bracket.close()
      if (last !== start) swallowNextClick()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      window.removeEventListener('blur', finish)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    window.addEventListener('blur', finish)
  }

  function resetGridSize(edge: Edge) {
    const node = blockRef.current
    const slot = gridSlotRead(node.values)
    const spec = gridMetricsOf(blockType(node.type))
    const least = leastSize(node, slot.h)
    editor.resizeNodeToSlot(node.id, {
      ...slot,
      ...(edge.includes('e') || edge.includes('w') ? { w: Math.max(spec.startWidth, least.w) } : {}),
      ...(edge.includes('n') || edge.includes('s') ? { h: Math.max(spec.startHeight, least.h) } : {}),
    })
  }

  return { startGridResize, resetGridSize }
}
