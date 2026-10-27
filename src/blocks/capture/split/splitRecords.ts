import { asNumber } from '../../../core/data/number'
import type { Split, SplitColumn } from '../../../core/data/split'
import { readDate } from '../../../runtime/chosenDay'
import { maskHost } from '../../../runtime/host'

type SplitTone = 'soon' | 'past' | undefined

const read = (record: unknown, field: string): string =>
  field === '' ? '' : maskHost().readField(record, field).trim()

function startOfDay(moment: Date): number {
  return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate()).getTime()
}

function compared(a: string, b: string): number {
  if (a === '' || b === '') return a === b ? 0 : a === '' ? 1 : -1
  const da = readDate(a)
  const db = readDate(b)
  if (da !== null && db !== null) return da.getTime() - db.getTime()
  const na = asNumber(a)
  const nb = asNumber(b)
  if (na !== null && nb !== null) return na - nb
  return a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' })
}

export function splitColumnText(record: unknown, column: SplitColumn): string {
  return read(record, column.field)
}

export function splitStock(split: Split, record: unknown): number | null {
  return split.stockField === '' ? null : asNumber(read(record, split.stockField))
}

// The records the split offers: without the hidden ones and, if asked, without
// those out of stock, in the order of the split's sort keys.
export function splitRows(split: Split, records: readonly unknown[]): unknown[] {
  const shown = records.filter((record) => {
    if (split.hide.some((h) => read(record, h.field) === h.value.trim())) return false
    if (!split.hideEmpty || split.stockField === '') return true
    const stock = splitStock(split, record)
    return stock === null || stock > 0
  })
  if (split.sort.length === 0) return shown
  return shown
    .map((record, at) => ({ record, at }))
    .sort((x, y) => {
      for (const key of split.sort) {
        const a = read(x.record, key.field)
        const b = read(y.record, key.field)
        // An empty value goes last in either direction.
        if ((a === '') !== (b === '')) return a === '' ? 1 : -1
        const order = compared(a, b)
        if (order !== 0) return key.down === true ? -order : order
      }
      return x.at - y.at
    })
    .map((o) => o.record)
}

export function splitTone(column: SplitColumn, value: string, today: Date = new Date()): SplitTone {
  if (column.soonDays === undefined) return undefined
  const date = readDate(value)
  if (date === null) return undefined
  const day = startOfDay(date)
  const now = startOfDay(today)
  if (day < now) return 'past'
  const soon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + column.soonDays).getTime()
  return day <= soon ? 'soon' : undefined
}
