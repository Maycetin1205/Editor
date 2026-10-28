import type { PointerEvent as ReactPointerEvent } from 'react'
import { cssZoomOf } from '../../../blocks/base/cssZoom'
import { DIALOG_MIN_HEIGHT, DIALOG_MIN_WIDTH } from '../../../blocks/dialog/DialogFrame'
import type { EditorStore } from '../../state/EditorStore'
import { swallowNextClick, type PointerDrag } from './pointerDrag'
import type { Edge } from './useBlockResize'

export type Axis = 'width' | 'height'

interface Size {
  width: number
  height: number
}

export function axesOf(edge: Edge): Axis[] {
  return [...(/[ew]/.test(edge) ? ['width' as const] : []), ...(/[ns]/.test(edge) ? ['height' as const] : [])]
}

// Pulls a centred window wider or taller at one grip, on both sides at once.
// Every change is written right away, all of them under one undo step. An
// end without a drop (Escape, a lost pointer or focus) puts the size back.
// The click after the release is the grip's: under a window it would reach
// the canvas and take the choice away.
export function sizeDrag(
  editor: EditorStore,
  e: ReactPointerEvent<HTMLElement>,
  edge: Edge,
  start: Size,
  write: (axis: Axis, value: number) => void,
): PointerDrag {
  e.preventDefault()
  e.stopPropagation()
  const startX = e.clientX
  const startY = e.clientY
  const zoom = cssZoomOf(e.currentTarget)
  const min: Size = { width: DIALOG_MIN_WIDTH, height: DIALOG_MIN_HEIGHT }
  const last: Size = { width: Math.round(start.width), height: Math.round(start.height) }

  const bracket = editor.history.openGesture()
  return {
    move: (ev) => {
      const dx = (ev.clientX - startX) / zoom
      const dy = (ev.clientY - startY) / zoom
      const pulled: Size = {
        width: start.width + 2 * (edge.includes('e') ? dx : edge.includes('w') ? -dx : 0),
        height: start.height + 2 * (edge.includes('s') ? dy : edge.includes('n') ? -dy : 0),
      }
      for (const axis of axesOf(edge)) {
        const next = Math.max(min[axis], Math.round(pulled[axis]))
        if (next === last[axis]) continue
        last[axis] = next
        bracket.open()
        write(axis, next)
      }
    },
    drop: () => {
      bracket.close()
      swallowNextClick()
    },
    cancel: () => bracket.cancel(),
  }
}
