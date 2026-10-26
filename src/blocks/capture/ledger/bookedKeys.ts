import { stripeOf } from '../../parts/cell'
import { cellsFields, enterCell } from '../cells'
import { keyIntent, type KeyIntent } from '../keys'
import type { CaptureLedger } from '../ledger'
import { firstCell } from '../row/typing'

const BOOKED_ROWS = '.body > .row:not(.capture)'

// How many booked rows a key moves the cursor.
const STEPS: ReadonlyMap<KeyIntent, number> = new Map([
  ['enter', 1],
  ['down', 1],
  ['up', -1],
  ['pageDown', 10],
  ['pageUp', -10],
])

function bookedFields(ledger: CaptureLedger, slots: readonly number[]): HTMLInputElement[] {
  return cellsFields(ledger.host.block.shadowRoot, BOOKED_ROWS, slots)
}

// Past the last booked row, Enter and Down go on in the typing row.
function cellNeighbour(
  ledger: CaptureLedger,
  slots: readonly number[],
  of: HTMLInputElement,
  step: number,
  intent: KeyIntent,
): void {
  const fields = bookedFields(ledger, slots)
  const now = fields.indexOf(of)
  if (now < 0) return
  let target = now + step
  if (target > fields.length - 1) {
    if (intent === 'enter' || intent === 'down') {
      ledger.host.focusCell(intent === 'enter' ? firstCell(ledger.row) : slots[0])
      return
    }
    target = fields.length - 1
  }
  if (target < 0) target = 0
  const field = fields[target]
  if (field === of) return
  enterCell(field)
}

export function keyCell(ledger: CaptureLedger, rawIndex: number, columnsIndex: number, e: KeyboardEvent): void {
  const field = e.target as HTMLInputElement
  const intent = keyIntent(e)

  if (intent === 'lookup') {
    e.preventDefault()
    return
  }
  if (intent === 'escape') {
    e.preventDefault()
    e.stopPropagation()
    ledger.booked.dropChange(rawIndex, columnsIndex)
    return
  }
  const step = STEPS.get(intent)
  if (step === undefined) return
  e.preventDefault()
  e.stopPropagation()
  const arrow = intent === 'down' || intent === 'up'
  const slots = arrow ? stripeOf(ledger.host.layout(), columnsIndex) : [columnsIndex]
  cellNeighbour(ledger, slots, field, step, intent)
}

export function enterLast(ledger: CaptureLedger, slots: readonly number[]): boolean {
  return enterCell(bookedFields(ledger, slots).at(-1))
}
