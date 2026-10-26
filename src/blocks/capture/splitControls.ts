import type { TemplateResult } from 'lit'
import type { ColumnView } from '../parts/column'
import type { CaptureLedger } from './ledger'
import { captureRow } from './ledger/capturing'
import { closeSplit, confirmSplit, splitAnchor } from './row/rowSplit'
import { openCell } from './row/typing'
import { splitKey } from './split/splitKeys'
import { splitListTpl } from './split/splitList'

// Confirmed picks capture the row; going back returns to the cell of the amount.
function key(ledger: CaptureLedger, e: KeyboardEvent): void {
  const row = ledger.row
  const outcome = splitKey(row.split.list, e)
  if (outcome === 'nothing') return
  e.preventDefault()
  e.stopPropagation()
  if (outcome === 'done') {
    confirmSplit(row)
    captureRow(ledger)
  } else if (outcome === 'back') {
    const anchor = splitAnchor(row)
    closeSplit(row)
    ledger.host.focusCell(anchor === -1 ? openCell(row) : anchor)
  }
  ledger.host.report()
}

// Focus moving within the list keeps it open.
function leave(ledger: CaptureLedger, e: FocusEvent): void {
  const into = e.relatedTarget
  const from = e.currentTarget
  if (into instanceof Node && from instanceof Node && from.contains(into)) return
  closeSplit(ledger.row)
  ledger.host.report()
}

// The list hangs from the cell of the amount, or from the last cell shown
// when the amount is not.
export function splitFor(
  ledger: CaptureLedger,
  view: ColumnView,
  preview: boolean,
): { slot: number; content: TemplateResult } | undefined {
  const list = ledger.row.split.list
  if (preview || !list.open) return undefined
  const anchor = splitAnchor(ledger.row)
  const slot = view.slots.includes(anchor) ? anchor : view.slots[view.slots.length - 1]
  if (slot === undefined) return undefined
  const title = anchor === -1 ? '' : (view.columns[view.slots.indexOf(anchor)]?.title ?? '')
  const changed = (change: () => void): void => {
    change()
    ledger.host.report()
  }
  const content = splitListTpl(list, title, {
    key: (e) => key(ledger, e),
    toggle: (i) => changed(() => list.toggle(i)),
    mark: (i) => changed(() => list.setMark(i)),
    amount: (i) => changed(() => list.editAmount(i)),
    leave: (e) => leave(ledger, e),
  })
  return typeof content === 'symbol' ? undefined : { slot, content }
}
