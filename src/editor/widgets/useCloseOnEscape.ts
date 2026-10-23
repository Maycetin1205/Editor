import { useEffect, useRef } from 'react'

const open: (() => void)[] = []

window.addEventListener('keydown', (e) => {
  const close = open.at(-1)
  if (e.key !== 'Escape' || close === undefined) return
  e.stopImmediatePropagation()
  close()
}, true)

export function useCloseOnEscape(onClose: () => void): void {
  const latest = useRef(onClose)
  useEffect(() => {
    latest.current = onClose
  })
  useEffect(() => {
    const close = (): void => latest.current()
    open.push(close)
    return () => {
      open.splice(open.indexOf(close), 1)
    }
  }, [])
}

export function OnEscape({ run }: { run: () => void }): null {
  useCloseOnEscape(run)
  return null
}
