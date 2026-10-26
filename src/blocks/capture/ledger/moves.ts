import { cellAbove, cellBelow, stripeOf } from '../../parts/cell'
import type { CaptureLedger } from '../ledger'
import { lookupAt } from '../row/lookupSpot'
import { holdBack, neighbour, settleCell } from '../row/typing'

// Leaving the typing row past its last cell captures it; up from its top line
// goes into the booked rows. Each returns false where the key did nothing.

export function jumpFrom(ledger: CaptureLedger, index: number): boolean {
  settleCell(ledger.row, index)
  const next = neighbour(ledger.row, index, 1)
  if (next !== -1) {
    ledger.host.focusCell(next)
    return true
  }
  return ledger.captured.captureRow()
}

// 'window' where the cell's text named no single record and the lookup window
// can show the candidates.
export function enterFrom(ledger: CaptureLedger, index: number): 'window' | 'done' {
  const row = ledger.row
  if (row.cells.held.has(index) && lookupAt(row, index) !== null) return 'window'
  settleCell(row, index)
  if (row.cells.held.has(index)) return 'done'
  if (ledger.captured.captureRow()) return 'done'
  const held = holdBack(row)
  if (held !== -1) {
    ledger.host.report()
    ledger.host.focusCell(held)
  }
  return 'done'
}

export function moveDown(ledger: CaptureLedger, index: number): boolean {
  settleCell(ledger.row, index)
  const below = cellBelow(ledger.host.layout(), index)
  if (below === -1) return ledger.captured.captureRow()
  ledger.host.focusCell(below)
  return true
}

export function moveUp(ledger: CaptureLedger, index: number): boolean {
  settleCell(ledger.row, index)
  const layout = ledger.host.layout()
  const above = cellAbove(layout, index)
  if (above === -1) return ledger.booked.enterLast(stripeOf(layout, index))
  ledger.host.focusCell(above)
  return true
}
