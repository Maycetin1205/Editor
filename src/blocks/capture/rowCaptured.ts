import { runEvent } from '../../runtime/actions/runEvent'

export const ROW_CAPTURED = 'onRowCaptured'

// Runs the event "Zeile erfasst" for the rows captured meanwhile. A row
// captured while it runs asks for one more round instead of a second run
// beside it; a row that failed to write stops the rounds.
export function rowCapturedRunner(block: HTMLElement, failed: () => boolean): () => void {
  let writing = false
  let again = false
  return () => {
    if (writing) {
      again = true
      return
    }
    writing = true
    void (async () => {
      try {
        await Promise.resolve()
        do {
          again = false
          if (failed()) break
          await runEvent(block, ROW_CAPTURED, {})
        } while (again)
      } finally {
        writing = false
      }
    })()
  }
}
