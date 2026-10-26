import { maskHost } from '../../../runtime/host'
import { walkOrder } from '../../parts/cell'
import { sourceCame } from '../../lookup/lookup'
import type { CaptureRow } from './captureRow'
import { targetIn, type CaptureContext } from './context'
import { recordField } from './linkedRecords'

interface CellView {
  value: string

  // Filled from a record or a calculation, not typed.
  automatic: boolean

  held: boolean
}

// What a cell holds before the calculations: its text, even an emptied one,
// else the field of the record chosen for its source.
export function givenIn(row: CaptureRow, context: CaptureContext, index: number): string {
  const typed = row.cells.typed.get(index)
  if (typed !== undefined) return typed
  const target = targetIn(context, index)
  if (target.sourceId === '' || target.code === '') return ''
  return recordField(row, target.sourceId, target.code)
}

export function valueIn(row: CaptureRow, context: CaptureContext, index: number): string {
  const typed = row.cells.typed.get(index)
  if (typed !== undefined && typed !== '') return typed
  return row.computed.get(index) ?? givenIn(row, context, index)
}

export function rowView(row: CaptureRow): CellView[] {
  const context = row.host.context()
  return context.columns.map((_, index) => {
    const typed = row.cells.typed.get(index)
    const computed = typed === '' && row.computed.has(index)
    const value = valueIn(row, context, index)
    return {
      value,
      automatic: (typed === undefined || computed) && value !== '',
      held: row.cells.held.has(index),
    }
  })
}

export function touched(row: CaptureRow): boolean {
  return row.records.chosen.size > 0 || [...row.cells.typed.values()].some((text) => text !== '')
}

// The name of each linked source still loading, at its first empty cell.
export function waitingSources(row: CaptureRow): Map<number, string> {
  const context = row.host.context()
  const named = new Map<number, string>()
  const seen = new Set<string>()
  for (const slot of walkOrder(row.host.layout())) {
    const target = targetIn(context, slot)
    if (target.kind !== 'linked' || seen.has(target.sourceId)) continue
    if (sourceCame(target.sourceId)) {
      seen.add(target.sourceId)
      continue
    }
    if (valueIn(row, context, slot) !== '') continue
    seen.add(target.sourceId)
    named.set(slot, maskHost().source(target.sourceId)?.name ?? '')
  }
  return named
}
