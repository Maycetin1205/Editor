import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { SE_FRAME_WIDTH } from '../../core/block/frameFit'

export const SHEET_MARGIN = 16

export type ZoomChoice = 'fit' | number

export const ZOOM_LEAST = 0.25
export const ZOOM_MOST = 3

export const ZOOM_PRESETS: readonly number[] = [0.5, 0.75, 1, 1.5, 2]

const ZOOM_STEPS: readonly number[] = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]

const KEPT_KEY = 'ff-editor-zoom'

function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MOST, Math.max(ZOOM_LEAST, Math.round(zoom * 1000) / 1000))
}

function fitOf(canvasWidth: number): number {
  const room = canvasWidth - 2 * SHEET_MARGIN
  return room > 0 ? Math.min(1, room / SE_FRAME_WIDTH) : 1
}

function keptChoice(): ZoomChoice {
  try {
    const kept = localStorage.getItem(KEPT_KEY)
    const zoom = Number(kept)
    return kept === null || kept === 'fit' || !Number.isFinite(zoom) || zoom <= 0 ? 'fit' : clampZoom(zoom)
  } catch {
    return 'fit'
  }
}

function keepChoice(choice: ZoomChoice): void {
  try {
    localStorage.setItem(KEPT_KEY, String(choice))
  } catch {
    // Without storage the zoom is simply not remembered.
  }
}

export function zoomStep(from: number, direction: 1 | -1): number {
  const next = direction > 0
    ? ZOOM_STEPS.find((step) => step > from + 0.005)
    : [...ZOOM_STEPS].reverse().find((step) => step < from - 0.005)
  return next ?? (direction > 0 ? ZOOM_MOST : ZOOM_LEAST)
}

// A point of the sheet, in its own unzoomed pixels, that stays under the same
// spot of the screen while the zoom changes.
interface Anchor {
  clientX: number
  clientY: number
  x: number
  y: number
}

export interface SheetZoom {
  zoom: number
  choice: ZoomChoice
  fit: number
  choose: (choice: ZoomChoice, at?: { clientX: number; clientY: number }) => void
}

export interface SheetZoomPlaces {
  canvas: RefObject<HTMLDivElement | null>
  sheet: RefObject<HTMLDivElement | null>
}

// Without a mouse to hold: the chosen block stays where it is on screen, or
// comes into view; with none chosen the left edge of the sheet and the line
// at the top of the view stay put.
function steadyAnchor(box: HTMLElement, paper: HTMLElement, zoom: number, chosenId: string | null): Anchor {
  const view = box.getBoundingClientRect()
  const rect = paper.getBoundingClientRect()
  const chosen = chosenId === null ? null : paper.querySelector(`[data-block-id="${CSS.escape(chosenId)}"]`)
  if (chosen) {
    const at = chosen.getBoundingClientRect()
    const seen = at.right > view.left && at.left < view.left + box.clientWidth
      && at.bottom > view.top && at.top < view.top + box.clientHeight
    return {
      clientX: seen ? Math.max(at.left, view.left) : view.left + SHEET_MARGIN,
      clientY: seen ? Math.max(at.top, view.top) : view.top + SHEET_MARGIN,
      x: (Math.max(at.left, seen ? view.left : at.left) - rect.left) / zoom,
      y: (Math.max(at.top, seen ? view.top : at.top) - rect.top) / zoom,
    }
  }
  const top = Math.max(rect.top, view.top)
  return { clientX: view.left + SHEET_MARGIN, clientY: top, x: 0, y: (top - rect.top) / zoom }
}

export function useSheetZoom(active: boolean, chosenId: string | null): SheetZoom & SheetZoomPlaces {
  const canvas = useRef<HTMLDivElement | null>(null)
  const sheet = useRef<HTMLDivElement | null>(null)
  const [fit, setFit] = useState(1)
  const [choice, setChoice] = useState<ZoomChoice>(keptChoice)
  const zoom = choice === 'fit' ? fit : choice

  const shown = useRef(zoom)
  const coming = useRef(zoom)
  const fitNow = useRef(fit)
  const anchor = useRef<Anchor | null>(null)
  const chosen = useRef(chosenId)

  useLayoutEffect(() => {
    const el = canvas.current
    if (!el) return
    const measure = (): void => setFit(fitOf(el.clientWidth))
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [])

  const choose = useCallback((next: ZoomChoice, at?: { clientX: number; clientY: number }) => {
    const kept = next === 'fit' ? 'fit' : clampZoom(next)
    const target = kept === 'fit' ? fitNow.current : kept
    const box = canvas.current
    const paper = sheet.current
    if (target !== coming.current && anchor.current === null && box && paper) {
      const rect = paper.getBoundingClientRect()
      anchor.current = at
        ? {
            clientX: at.clientX,
            clientY: at.clientY,
            x: (at.clientX - rect.left) / shown.current,
            y: (at.clientY - rect.top) / shown.current,
          }
        : steadyAnchor(box, paper, shown.current, chosen.current)
    }
    coming.current = target
    setChoice(kept)
    keepChoice(kept)
  }, [])

  useLayoutEffect(() => {
    shown.current = zoom
    coming.current = zoom
    fitNow.current = fit
    chosen.current = chosenId
    const at = anchor.current
    anchor.current = null
    const box = canvas.current
    const paper = sheet.current
    if (!at || !box || !paper) return
    const rect = paper.getBoundingClientRect()
    box.scrollLeft += rect.left + at.x * zoom - at.clientX
    box.scrollTop += rect.top + at.y * zoom - at.clientY
    // What floats over the sheet measures itself again on a scroll.
    box.dispatchEvent(new Event('scroll'))
  })

  useEffect(() => {
    const box = canvas.current
    if (!box || !active) return
    const wheel = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const speed = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 0.05 : 0.002
      choose(coming.current * Math.exp(-e.deltaY * speed), { clientX: e.clientX, clientY: e.clientY })
    }
    box.addEventListener('wheel', wheel, { passive: false })
    return () => box.removeEventListener('wheel', wheel)
  }, [active, choose])

  useEffect(() => {
    if (!active) return
    const key = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      let next: ZoomChoice
      if (e.key === '+' || e.key === '=') next = zoomStep(coming.current, 1)
      else if (e.key === '-') next = zoomStep(coming.current, -1)
      else if (e.key === '0') next = 'fit'
      else return
      e.preventDefault()
      choose(next)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [active, choose])

  return { zoom, choice, fit, choose, canvas, sheet }
}
