import { useCallback, useEffect, useRef } from 'react'
import { holdEscape } from '../widgets/useCloseOnEscape'

// The steps of one drag, from the press to the release. Each step is
// optional; the helper below calls them, the caller only says what they do.
export interface PointerDrag {
  // Whether this move carries the pointer far enough to start. Without it
  // the drag starts on the press, and a release always counts as a drop.
  starts?: (ev: PointerEvent) => boolean
  begin?: () => void
  move?: (ev: PointerEvent) => void
  // Released after the drag started.
  drop?: (ev: PointerEvent) => void
  // Released before the drag started.
  click?: (ev: PointerEvent) => void
  // Escape, a cancelled pointer, a window losing focus, or an unmount; also
  // before the drag started.
  cancel?: () => void
}

// What the helper needs of the press, a React or a DOM pointer event.
interface Press {
  pointerId: number
  currentTarget: EventTarget | null
}

interface Capturing {
  setPointerCapture: (id: number) => void
  releasePointerCapture: (id: number) => void
  hasPointerCapture: (id: number) => boolean
}

function capturing(target: EventTarget | null): Capturing | null {
  const el = target as Partial<Capturing> | null
  return typeof el?.setPointerCapture === 'function' ? (el as Capturing) : null
}

function swallowClick(ev: Event): void {
  ev.stopPropagation()
  ev.preventDefault()
}

// The click that follows a pointerup in the same task must not select or
// deselect anything after a drag.
export function swallowNextClick(on: EventTarget = window): void {
  on.addEventListener('click', swallowClick, { capture: true, once: true })
  setTimeout(() => {
    on.removeEventListener('click', swallowClick, { capture: true })
  }, 0)
}

type Phase = 'waiting' | 'dragging' | 'cancelled' | 'over'

// Starts one drag at a press and returns what ends it from outside (an
// unmount). Listens on `on`, the window outside of tests.
export function startPointerDrag(press: Press, drag: PointerDrag, on: EventTarget = window): () => void {
  const id = press.pointerId
  const holder = capturing(press.currentTarget)
  let phase: Phase = 'waiting'
  const letEscape = holdEscape()

  const release = (): void => {
    try {
      if (holder?.hasPointerCapture(id)) holder.releasePointerCapture(id)
    } catch {
      // The element has left the page and holds no capture any more.
    }
  }
  const begin = (): void => {
    phase = 'dragging'
    try {
      holder?.setPointerCapture(id)
    } catch {
      // The pointer is gone already; the window still hears the release.
    }
    drag.begin?.()
  }
  const finish = (): void => {
    phase = 'over'
    letEscape()
    release()
    on.removeEventListener('pointermove', onMove)
    on.removeEventListener('pointerup', onUp)
    on.removeEventListener('pointercancel', onLost)
    on.removeEventListener('blur', onLost)
    on.removeEventListener('keydown', onKey, true)
  }
  const cancel = (): void => {
    const running = phase === 'waiting' || phase === 'dragging'
    finish()
    if (running) drag.cancel?.()
  }

  function onMove(ev: Event): void {
    const move = ev as PointerEvent
    if (move.pointerId !== id) return
    if (phase === 'waiting' && drag.starts?.(move) === true) begin()
    if (phase === 'dragging') drag.move?.(move)
  }
  function onUp(ev: Event): void {
    const up = ev as PointerEvent
    if (up.pointerId !== id) return
    const was = phase
    finish()
    if (was === 'dragging') drag.drop?.(up)
    else if (was === 'waiting') drag.click?.(up)
    // Cancelled by Escape: the release is not a click either.
    else swallowNextClick(on)
  }
  function onLost(ev: Event): void {
    if (ev.type === 'pointercancel' && (ev as PointerEvent).pointerId !== id) return
    cancel()
  }
  // Escape belongs to the drag while the pointer is held, so it does not
  // also deselect the block or close an open window first (holdEscape). The
  // release that follows only ends the hold.
  function onKey(ev: Event): void {
    if ((ev as KeyboardEvent).key !== 'Escape') return
    ev.stopPropagation()
    if (phase !== 'waiting' && phase !== 'dragging') return
    phase = 'cancelled'
    release()
    drag.cancel?.()
  }

  on.addEventListener('pointermove', onMove)
  on.addEventListener('pointerup', onUp)
  on.addEventListener('pointercancel', onLost)
  on.addEventListener('blur', onLost)
  on.addEventListener('keydown', onKey, true)
  if (drag.starts === undefined) begin()
  return cancel
}

type StartDrag = (press: Press, drag: PointerDrag | null) => void

// One drag at a time for the component that calls it; an unmount cancels
// the drag that is still running.
export function usePointerDrag(): StartDrag {
  const running = useRef<(() => void) | null>(null)
  useEffect(() => {
    const slot = running
    return () => slot.current?.()
  }, [])
  return useCallback((press, drag) => {
    if (drag === null) return
    running.current?.()
    running.current = startPointerDrag(press, drag)
  }, [])
}
