import { walkOrder } from '../../parts/cell'
import { plainText } from '../../parts/cellSearch'
import { ensureSource } from '../../../runtime/fetchingSources'
import { sourceCame } from '../../lookup/lookup'
import type { CaptureColumn } from '../column'
import { forgetCell, type CaptureRow } from './captureRow'
import { rowView, valueIn } from './cellValues'
import { targetIn } from './context'
import { chooseRecord, entriesIn, syncChosen, takeRecord } from './linkedRecords'

function neighbourSlot(shown: readonly number[], from: number, direction: 1 | -1): number {
  const next = direction === 1 ? shown.find((slot) => slot > from) : shown.findLast((slot) => slot < from)
  return next ?? -1
}

function missingRequired(
  columns: readonly CaptureColumn[],
  values: readonly string[],
  shown: readonly number[],
): number {
  return shown.find((slot) => columns[slot]?.required === true && (values[slot] ?? '').trim() === '') ?? -1
}

export function typeCell(row: CaptureRow, index: number, text: string): void {
  row.split.done = false
  row.cells.typed.set(index, text)
  row.cells.held.delete(index)
  row.cells.waiting.delete(index)
  row.cells.captureAsked = false
  row.cells.cursor = index
  row.suggestions.restart()
  row.host.report()
}

// A linked cell takes the one record its text names exactly; naming none or
// several, it holds the row back. Before its source has come, it waits.
export function settleCell(row: CaptureRow, index: number): void {
  const context = row.host.context()
  const typed = (row.cells.typed.get(index) ?? '').trim()
  const target = targetIn(context, index)
  if (typed === '' || target.kind !== 'linked') return
  if (!sourceCame(target.sourceId)) {
    void ensureSource(target.sourceId)
    row.cells.waiting.add(index)
    return
  }
  row.cells.waiting.delete(index)
  const wanted = plainText(typed)
  const exact = entriesIn(row, context, index).filter((e) => plainText(e.value.trim()) === wanted)
  if (exact.length === 1) takeRecord(row, context, index, exact[0].record)
  else row.cells.held.add(index)
  if (row.cells.cursor === index) {
    row.cells.cursor = -1
    row.suggestions.idle()
  }
  row.host.report()
}

export function leaveCell(row: CaptureRow, index: number): void {
  if (row.cells.cursor === index) {
    settleCell(row, index)
    row.cells.cursor = -1
    row.suggestions.idle()
  }
  row.host.report()
}

// Emptying a cell of a chosen record lets go of the record.
export function emptyCell(row: CaptureRow, index: number): void {
  const context = row.host.context()
  row.split.done = false
  forgetCell(row, index)
  row.cells.captureAsked = false
  const target = targetIn(context, index)
  if (target.sourceId !== '' && row.records.chosen.has(target.sourceId)) {
    chooseRecord(row, context, target.sourceId, undefined)
    syncChosen(row, context)
  }
  row.suggestions.restart()
  row.host.report()
}

// The first cell that holds the row back, -1 for none. A required cell left
// empty starts to hold it back here.
export function holdBack(row: CaptureRow): number {
  const context = row.host.context()
  const order = walkOrder(row.host.layout())
  const held = order.find((slot) => row.cells.held.has(slot))
  if (held !== undefined) return held
  const values = context.columns.map((_, i) => valueIn(row, context, i))
  const missing = missingRequired(context.columns, values, order)
  if (missing !== -1) row.cells.held.add(missing)
  return missing
}

// The next cell to type in, -1 past the end; cells filled from a record or a
// calculation are passed over.
export function neighbour(row: CaptureRow, from: number, direction: 1 | -1): number {
  const view = rowView(row)
  const typed = walkOrder(row.host.layout()).filter((slot) => view[slot]?.automatic !== true)
  return neighbourSlot(typed, from, direction)
}

export function firstCell(row: CaptureRow): number {
  return walkOrder(row.host.layout())[0] ?? 0
}

// Where typing goes on: the cell that holds the row back, else the first
// empty cell to type in.
export function openCell(row: CaptureRow): number {
  const order = walkOrder(row.host.layout())
  const held = order.find((slot) => row.cells.held.has(slot))
  if (held !== undefined) return held
  const view = rowView(row)
  const open = order.find((slot) => view[slot]?.automatic !== true && (view[slot]?.value ?? '') === '')
  return open ?? firstCell(row)
}
