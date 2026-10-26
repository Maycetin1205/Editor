import type { SplitPick } from '../split/splitState'
import { clearRow, type CaptureRow } from './captureRow'
import { computeCells, yieldToComputed } from './computedCells'
import type { CaptureContext } from './context'
import { chooseRecord } from './linkedRecords'

// What a captured row keeps beside its values, to come back into the typing
// row as it was: the records of its helper sources and the split picks.
export interface Helpers {
  chosen: ReadonlyMap<string, unknown>
  byHand: ReadonlySet<string>
  picks: readonly SplitPick[]
}

export function helpersNow(row: CaptureRow): Helpers {
  return {
    chosen: new Map(row.records.chosen),
    byHand: new Set(row.records.byHand),
    picks: [...row.split.picks],
  }
}

export function adoptRow(row: CaptureRow, context: CaptureContext, values: readonly string[], helpers: Helpers): void {
  clearRow(row)
  values.forEach((value, index) => {
    if (value !== '') row.cells.typed.set(index, value)
  })
  for (const [sourceId, record] of helpers.chosen) chooseRecord(row, context, sourceId, record)
  for (const sourceId of helpers.byHand) row.records.byHand.add(sourceId)
  row.split.picks = [...helpers.picks]
  yieldToComputed(row, context)
  computeCells(row, context)
}
