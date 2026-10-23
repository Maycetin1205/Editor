import { patternPieces, replacementsOf, type SlotForm } from '../../core/block/fieldPattern'
import { shownFigure } from '../../core/data/number'
import { readDate } from '../../runtime/chosenDay'
import type { FieldReader } from '../../runtime/foreignSources'

const AMOUNT_DECIMALS = 2

function dayText(day: Date): string {
  return `${String(day.getDate()).padStart(2, '0')}.${String(day.getMonth() + 1).padStart(2, '0')}.${day.getFullYear()}`
}

// A day SoftEngine writes without points, as 20261022.
function compactDay(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(value)
  if (!m) return null
  const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return day.getMonth() === Number(m[2]) - 1 && day.getDate() === Number(m[3]) ? day : null
}

export function formed(value: string, form: SlotForm | undefined): string {
  const t = value.trim()
  if (t === '' || !form) return value
  if (form === 'date') {
    const day = readDate(t) ?? compactDay(t)
    return day ? dayText(day) : value
  }
  return shownFigure(t, form === 'amount' ? AMOUNT_DECIMALS : null)
}

// The reader of a text: a value its "Werte ersetzen" names shows as the word
// given there.
export function replacingReader(read: FieldReader, replace: string): FieldReader {
  const words = replacementsOf(replace)
  if (words.size === 0) return read
  return (row, field) => {
    const value = read(row, field)
    return words.get(value.trim()) ?? value
  }
}

export function patternText(pattern: string, row: unknown, read: FieldReader, empty: string): string {
  return patternPieces(pattern)
    .map((p) => {
      if (p.field === undefined) return p.text
      const value = formed(read(row, p.field), p.form)
      return value.trim() === '' ? empty : value
    })
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim()
}
