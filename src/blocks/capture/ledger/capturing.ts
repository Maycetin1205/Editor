import type { CaptureLedger } from '../ledger'
import { clearRow } from '../row/captureRow'
import { touched, valueIn } from '../row/cellValues'
import { computeCells } from '../row/computedCells'
import type { CaptureContext } from '../row/context'
import { adoptRow, helpersNow } from '../row/rowHelpers'
import { openSplit } from '../row/rowSplit'
import { firstCell, holdBack } from '../row/typing'

type Capturing = 'captured' | 'nothing' | 'waits' | 'split' | 'asks' | { missing: number }

// Moves the typing row into the captured rows, unless a cell holds it back,
// a source is still loading or its amount is still to be split. A corrected
// row emptied asks before it goes.
function capture(ledger: CaptureLedger, context: CaptureContext): Capturing {
  const { row, captured } = ledger
  computeCells(row, context)
  const values = context.columns.map((_, i) => valueIn(row, context, i))
  if (values.every((w) => w === '')) {
    if (!captured.correcting) return 'nothing'
    captured.askDrop()
    return 'asks'
  }
  const missing = holdBack(row)
  if (missing !== -1) return { missing }
  if (row.cells.waiting.size > 0) return 'waits'
  if (openSplit(row, context) !== 'none') return 'split'
  captured.add(values, helpersNow(row))
  clearRow(row)
  ledger.host.rowAdded()
  return 'captured'
}

// False where the row was empty and nothing happened.
export function captureRow(ledger: CaptureLedger): boolean {
  const host = ledger.host
  const outcome = capture(ledger, host.context())
  if (outcome === 'nothing') return false
  if (outcome === 'split') host.splitOpened()
  else if (outcome === 'captured') host.captured()
  else if (outcome === 'waits') ledger.row.cells.captureAsked = true
  else if (outcome === 'asks') host.dropAsked()
  else {
    host.report()
    host.focusCell(outcome.missing)
  }
  return true
}

// Takes a captured row back into the typing row; what is typed there now is
// captured first.
export function bringBack(ledger: CaptureLedger, index: number): void {
  const { row: typing, captured, host } = ledger
  const context = host.context()
  const taken = captured.correctable(index)
  if (taken === undefined) return
  const before = capture(ledger, context)
  if (typeof before === 'object') {
    host.report()
    host.focusCell(before.missing)
    return
  }
  if (before === 'waits') return
  if (before === 'asks') {
    host.dropAsked()
    return
  }
  if (before === 'split') {
    host.splitOpened()
    return
  }
  if (!captured.takeBack(taken)) return
  adoptRow(typing, context, taken.values, taken)
  host.report()
  host.focusCell(firstCell(typing))
}

// The answer to the question before an emptied corrected row goes. Focus
// stays where it went when the question lost it.
export function answerDrop(ledger: CaptureLedger, drop: boolean, refocus: boolean): void {
  const { row, captured, host } = ledger
  if (!captured.dropAsked) return
  if (drop) {
    captured.dropCorrection()
    clearRow(row)
  } else {
    captured.keepCorrection()
  }
  host.report()
  if (refocus) host.focusCell(firstCell(row))
}

// Escape gives up the typing row: it empties, and a row taken back to be
// corrected returns to its place.
export function giveUp(ledger: CaptureLedger): boolean {
  const { row, captured, host } = ledger
  if (!captured.correcting && !touched(row)) return false
  captured.restoreCorrection()
  clearRow(row)
  host.report()
  host.focusCell(firstCell(row))
  return true
}
