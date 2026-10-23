import { listForExport, withEntryValue, type EntrySwitch, type ListBinding } from '../../core/block/listBinding'
import { entryEventKeys, type EntryEvents } from '../../core/block/capability'
import { listProperty, type Property } from '../../core/block/property'
import { isUnread } from '../../core/unread'
import { holdingChoice } from '../parts/column'

export type ValueLine = {
  label: string
  field: string

  figure?: boolean
  amount?: boolean

  sum?: boolean

  labelTyped?: boolean

  click?: string
}

const DEFAULT_LABEL = 'Zeile {n}'

export const LINE_CLICKS = entryEventKeys('lineClick', 40)

const LINE_CLICK_KEYS = new Set(LINE_CLICKS.map((ev) => ev.key))

export const LINE_CLICK_EVENTS: EntryEvents<ValueLine, 'lines'> = {
  prop: 'lines',
  name: 'geklickt',
  keyOf: (line) => line.click,
  withKey: (line, key) => withEntryValue(line, 'click', key),
}

function newLine(index: number): ValueLine {
  return { label: DEFAULT_LABEL.replace('{n}', String(index + 1)), field: '' }
}

function asLine(raw: unknown, index: number): ValueLine {
  if (!isUnread<ValueLine>(raw)) return newLine(index)
  return {
    label: typeof raw.label === 'string' ? raw.label : newLine(index).label,
    field: typeof raw.field === 'string' ? raw.field : '',
    ...(raw.figure === true ? { figure: true } : {}),
    ...(raw.amount === true ? { amount: true } : {}),
    ...(raw.sum === true ? { sum: true } : {}),
    ...(raw.labelTyped === true ? { labelTyped: true } : {}),
    ...(typeof raw.click === 'string' && LINE_CLICK_KEYS.has(raw.click) ? { click: raw.click } : {}),
  }
}

function coerceLines(v: unknown): ValueLine[] {
  const lines = Array.isArray(v) ? v.map(asLine) : []
  const taken = new Set<string>()
  const own = lines.map((line) => {
    if (line.click === undefined) return line
    if (!taken.has(line.click)) {
      taken.add(line.click)
      return line
    }
    const copy = { ...line }
    delete copy.click
    return copy
  })
  return own.length > 0 ? own : [newLine(0)]
}

function withMovedLine(lines: readonly ValueLine[], from: number, to: number): ValueLine[] | null {
  if (from < 0 || from >= lines.length) return null
  const target = Math.max(0, Math.min(to, lines.length - 1))
  if (target === from) return null
  const next = [...lines]
  const [line] = next.splice(from, 1)
  next.splice(target, 0, line)
  return next
}

const SUM: EntrySwitch<ValueLine> = {
  key: 'sum',
  name: 'Summe: Strich darüber, groß im Akzent',
  short: 'Summe',
  valueOf: (line) => line.sum,
  withValue: (line, on) => withEntryValue(line, 'sum', on),
}

export const LINES_BINDING: ListBinding<ValueLine, 'lines'> = {
  prop: 'lines',
  defaultTitle: DEFAULT_LABEL,
  entries: coerceLines,

  titleOf: (line) => line.label,
  fieldOf: (line) => line.field,
  withTypedTitle: (line, label) =>
    withEntryValue({ ...line, label }, 'labelTyped', label.trim() === '' ? undefined : true),
  withPickedField: (line, field, fieldTitle) => ({
    ...line,
    ...(line.labelTyped === true ? {} : { label: fieldTitle }),
    field,
  }),
  withoutEditorMarks: (line) => withEntryValue(line, 'labelTyped', undefined),

  entryAdd: (lines) => [...lines, newLine(lines.length)],
  entryRemove: (lines, index) =>
    lines.length <= 1 || index < 0 || index >= lines.length ? null : lines.filter((_, i) => i !== index),
  entryMove: withMovedLine,

  entryHeads: true,
  entriesDown: true,

  entryFlag: [SUM],
  entryChoice: [holdingChoice<ValueLine>('Art')],
}

const NEW_LINES = 3

export function linesProperty(): Property<ValueLine[]> {
  return listProperty<ValueLine[]>(
    coerceLines,
    {
      default: Array.from({ length: NEW_LINES }, (_, i) => newLine(i)),
      label: 'Zeilen',
      place: 'block',
      attribute: 'lines',
    },
    (value) => listForExport(value, LINES_BINDING),
  )
}
