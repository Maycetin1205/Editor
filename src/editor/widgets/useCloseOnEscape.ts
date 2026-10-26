import { useEffect, useRef } from 'react'

const open: (() => void)[] = []

// Drags that hold the pointer (canvas/pointerDrag.ts). While one runs,
// Escape passes the open windows by and ends the drag first.
let drags = 0

window.addEventListener(
  'keydown',
  (e) => {
    const close = open.at(-1)
    if (e.key !== 'Escape' || close === undefined || drags > 0) return
    e.stopImmediatePropagation()
    close()
  },
  true,
)

// Returns what lets Escape go to the windows again.
export function holdEscape(): () => void {
  drags += 1
  let held = true
  return () => {
    if (!held) return
    held = false
    drags -= 1
  }
}

// The window opened last closes on Escape; returns what takes it off.
export function onEscape(close: () => void): () => void {
  open.push(close)
  return () => {
    const at = open.indexOf(close)
    if (at !== -1) open.splice(at, 1)
  }
}

export function useCloseOnEscape(onClose: () => void): void {
  const latest = useRef(onClose)
  useEffect(() => {
    latest.current = onClose
  })
  useEffect(() => onEscape(() => latest.current()), [])
}

export function OnEscape({ run }: { run: () => void }): null {
  useCloseOnEscape(run)
  return null
}
