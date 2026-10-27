import { asNumber } from '../../core/data/number'
import { dayKey } from '../../runtime/chosenDay'
import { FIELD_TYPES, type FieldType } from './properties'

// What the browser's input holds and what the mask holds differ for dates
// (ISO in the input, German in the mask) and numbers (point in the input,
// comma in the mask).

export function fieldTypeOf(v: unknown): FieldType {
  return FIELD_TYPES.includes(v as FieldType) ? (v as FieldType) : 'text'
}

function dateFromInput(value: string): string {
  const iso = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(value)
  return iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : value
}

function dateForInput(value: string): string {
  const german = /^(\d{2})\.(\d{2})\.(\d{4,})$/.exec(value)
  return german ? `${german[3]}-${german[2]}-${german[1]}` : dayKey(value) || value
}

function numberFromInput(value: string): string {
  return value.replace('.', ',')
}

function numberForInput(value: string): string {
  const number = asNumber(value)
  return number === null ? '' : String(number)
}

export function forInput(kind: FieldType, value: string): string {
  if (kind === 'date') return dateForInput(value)
  return kind === 'number' ? numberForInput(value) : value
}

export function fromInput(kind: FieldType, value: string): string {
  if (kind === 'date') return dateFromInput(value)
  return kind === 'number' ? numberFromInput(value) : value
}
