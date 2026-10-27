import { sourceCame } from '../../lookup/lookup'
import type { CaptureRow } from './captureRow'
import { computeCells } from './computedCells'
import { targetIn } from './context'
import { openSplit } from './rowSplit'
import { suggestionsFor } from './suggestions'
import { settleCell } from './typing'

// Before each render: a split waiting for its source opens, cells waiting for
// theirs settle, computed cells and suggestions follow. True when the row is
// to be captured now, because it only waited for a source.
export function refreshRow(row: CaptureRow): boolean {
  const context = row.host.context()
  let came = false
  const split = context.split
  if (row.split.list.loading && split !== undefined && sourceCame(split.sourceId)) {
    if (openSplit(row, context) === 'none') {
      row.split.list.stop()
      row.cells.captureAsked = false
      computeCells(row, context)
      return true
    }
  }
  for (const index of [...row.cells.waiting]) {
    if (!sourceCame(targetIn(context, index).sourceId)) continue
    settleCell(row, index)
    came = true
  }
  computeCells(row, context)
  row.suggestions.show(suggestionsFor(row, context))
  if (!came || !row.cells.captureAsked || row.cells.waiting.size > 0) return false
  row.cells.captureAsked = false
  return true
}
