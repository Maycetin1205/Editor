import { useEffect } from 'react'

// Whether an event comes from one of the editor's helpers (a dialog or a
// floating bar): a press or a scroll there does not close the bar.
function fromEditorHelper(e: Event): boolean {
  return e
    .composedPath()
    .some(
      (t) =>
        t instanceof HTMLElement && (t.getAttribute('role') === 'dialog' || t.dataset.ffEditorHelper !== undefined),
    )
}

export function useCloseOnPressBeside(onClose: () => void): void {
  useEffect(() => {
    const beside = (e: PointerEvent): void => {
      if (!fromEditorHelper(e)) onClose()
    }
    document.addEventListener('pointerdown', beside, true)
    return () => document.removeEventListener('pointerdown', beside, true)
  }, [onClose])
}

export function useCloseOnScrollBeside(onClose: () => void): void {
  useEffect(() => {
    const scrolled = (e: Event): void => {
      if (!fromEditorHelper(e)) onClose()
    }
    document.addEventListener('scroll', scrolled, true)
    return () => document.removeEventListener('scroll', scrolled, true)
  }, [onClose])
}
