import { asNumber } from '../../../core/data/number'
import { sourceCame, sourcesRows } from '../../lookup/lookup'
import { splitRows } from '../split/splitRecords'
import type { CaptureRow } from './captureRow'
import { valueIn } from './cellValues'
import type { CaptureContext } from './context'
import { possibleRecords } from './linkedRecords'

type SplitOpening = 'none' | 'open' | 'waits'

// The split opens before the row is captured, unless the row has none, its
// picks are confirmed, or no record fits. While its source loads, the list
// opens empty and waits.
export function openSplit(row: CaptureRow, context: CaptureContext): SplitOpening {
  const split = context.split
  if (split === undefined || row.split.done) return 'none'
  const amountAt = context.columns.findIndex((c) => c.key === split.amountColumn)
  const total = amountAt === -1 ? null : asNumber(valueIn(row, context, amountAt))
  if (!sourceCame(split.sourceId)) {
    row.split.list.start(split, [], total, row.split.picks, true)
    return 'waits'
  }
  const rows = splitRows(split, possibleRecords(row, context, split.sourceId, sourcesRows(split.sourceId) ?? []))
  if (rows.length === 0) {
    row.split.picks = []
    return 'none'
  }
  row.split.list.start(split, rows, total, row.split.picks)
  return 'open'
}

// Closing keeps the picks for the next opening; a list still loading has none.
export function closeSplit(row: CaptureRow): void {
  const list = row.split.list
  if (!list.open) return
  if (!list.loading) row.split.picks = list.picked()
  list.stop()
}

export function confirmSplit(row: CaptureRow): void {
  row.split.picks = row.split.list.picked()
  row.split.done = true
  row.split.list.stop()
}

// The column whose amount the split spreads, -1 for none.
export function splitAnchor(row: CaptureRow): number {
  const key = row.split.list.split?.amountColumn ?? ''
  return row.host.context().columns.findIndex((c) => c.key === key)
}
