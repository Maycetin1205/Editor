import { columnSlots, rowValues } from '../../../core/data/calculation'
import { columnWithKey } from '../../parts/column'
import type { CaptureRow } from './captureRow'
import { givenIn } from './cellValues'
import type { CaptureContext } from './context'
import { recordField } from './linkedRecords'

export function computeCells(row: CaptureRow, context: CaptureContext): void {
  row.computed = rowValues(
    context.calculations,
    (key) => columnWithKey(context.columns, key),
    (slot) => givenIn(row, context, slot),
    (sourceId, field) => recordField(row, sourceId ?? context.sourceId, field),
  )
}

// A computed cell keeps a typed value only where it differs from what the
// calculation gives; otherwise the cell follows the calculation again.
export function yieldToComputed(row: CaptureRow, context: CaptureContext): void {
  const slots = columnSlots(context.calculations, (key) => columnWithKey(context.columns, key))
  for (const index of slots) {
    const value = row.cells.typed.get(index)
    if (value === undefined || value === '') continue
    row.cells.typed.delete(index)
    computeCells(row, context)
    if (row.computed.get(index) !== value) row.cells.typed.set(index, value)
  }
}
