import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from '@/editor/icons/icon'
import { cssZoomOf } from '../../blocks/base/cssZoom'

const PLUS_SIZE = 20

const PLUS_GAP = 4

interface Place {
  left: number
  top: number
}

// On screen beside the last head, or nowhere when that lies outside the
// visible part of the canvas.
function plusPlace(frame: HTMLElement | null, x: number, y: number, down: boolean): Place | null {
  const at = frame?.getBoundingClientRect()
  const zoom = frame ? cssZoomOf(frame) : 1
  const canvas = frame?.closest('[data-ff-canvas]')
  const sheet = canvas?.getBoundingClientRect()
  const edge = canvas && sheet ? sheet.left + canvas.clientWidth : document.documentElement.clientWidth
  const left = Math.min((at?.left ?? 0) + x * zoom + (down ? 0 : PLUS_GAP), edge - PLUS_SIZE - PLUS_GAP)
  const top = (at?.top ?? 0) + y * zoom + (down ? PLUS_GAP : -PLUS_SIZE / 2)
  const shown =
    at !== undefined && sheet !== undefined && left >= sheet.left && top >= sheet.top && top + PLUS_SIZE <= sheet.bottom
  return shown ? { left, top } : null
}

interface ColumnPlusProps {
  frame: RefObject<HTMLElement | null>

  x: number
  y: number
  down: boolean

  label: string
  onAdd: () => void
}

export function ColumnPlus({ frame, x, y, down, label, onAdd }: ColumnPlusProps) {
  const [place, setPlace] = useState<Place | null>(null)
  const measure = useRef<() => void>(() => {})

  // After every render: the frame moves with its block, not only with these
  // props.
  useLayoutEffect(() => {
    measure.current = () => {
      const next = plusPlace(frame.current, x, y, down)
      setPlace((before) => (before?.left === next?.left && before?.top === next?.top ? before : next))
    }
    measure.current()
  })

  // Scrolling and resizing move the frame without a render.
  useEffect(() => {
    const again = (): void => measure.current()
    window.addEventListener('scroll', again, { capture: true, passive: true })
    window.addEventListener('resize', again)
    return () => {
      window.removeEventListener('scroll', again, { capture: true })
      window.removeEventListener('resize', again)
    }
  }, [])

  if (place === null) return null
  return createPortal(
    <button
      type="button"
      data-ff-editor-helper
      aria-label={label}
      title={label}
      className="fixed z-30 grid place-items-center rounded border border-line bg-panel text-selection hover:bg-selection/[.08]"
      style={{ left: place.left, top: place.top, width: PLUS_SIZE, height: PLUS_SIZE }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onAdd()
      }}
    >
      <Plus size={13} />
    </button>,
    document.body,
  )
}
