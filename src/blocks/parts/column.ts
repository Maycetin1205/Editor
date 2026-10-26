import {
  assignKeys,
  listForExport,
  withEntryValue,
  type EntryChoice,
  type EntrySwitch,
  type ListBinding,
} from '../../core/block/listBinding'
import { listProperty, segmentProperty, type Property } from '../../core/block/property'
import { leadDecimals, namesColumn, type Calculation } from '../../core/data/calculation'
import { shownFigure } from '../../core/data/number'
import { isUnread } from '../../core/unread'

export type Column = {
  key: string
  title: string
  field: string

  width?: number

  total?: boolean

  figure?: boolean

  amount?: boolean

  hidden?: boolean

  titleTyped?: boolean
}

export interface ColumnView {
  columns: readonly Column[]
  slots: readonly number[]
}

export const FIELD_KEY_PREFIX = 'field:'

export interface Figure {
  decimals: number | null
}

export function figureOf(column: Column, calculations: readonly Calculation[]): Figure | null {
  const decimals = column.amount === true ? AMOUNT_DECIMALS : leadDecimals(calculations, column.key)
  if (decimals !== undefined) return { decimals }
  return column.total === true || column.figure === true || namesColumn(calculations, column.key)
    ? { decimals: null }
    : null
}

const AMOUNT_DECIMALS = 2

export function shownValue(figure: Figure | null, value: string): string {
  return figure === null ? value : shownFigure(value, figure.decimals)
}

const COLUMNS_MIN = 1

export const COLUMNS_MAX = 16

export const COLUMNS_MIN_WIDTH = 40

export const DEFAULT_TITLE = 'Spalte {n}'

function defaultTitleFor(index: number): string {
  return DEFAULT_TITLE.replace('{n}', String(index + 1))
}

export function newColumn(index: number): Column {
  return { key: '', title: defaultTitleFor(index), field: '' }
}

export function columnWithKey(columns: readonly Column[], key: string): number {
  const t = key.trim()
  if (t === '') return -1
  return columns.findIndex((s) => s.key === t)
}

function withKeys(columns: readonly Column[]): Column[] {
  const keys = assignKeys(columns.map((s) => s.key))
  return columns.map((s, i) => (s.key === keys[i] ? s : { ...s, key: keys[i] }))
}

export function defaultColumns(): Column[] {
  return withKeys([newColumn(0)])
}

function asWidth(v: unknown): number | undefined {
  const number = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(number)) return undefined
  const rounded = Math.round(number)
  return rounded < COLUMNS_MIN_WIDTH ? COLUMNS_MIN_WIDTH : rounded
}

const KNOWN_FACTS: readonly string[] = [
  'key',
  'title',
  'field',
  'width',
  'total',
  'figure',
  'amount',
  'euro',
  'hidden',
  'titleTyped',
]

function extraFacts(entry: object): object {
  return Object.fromEntries(
    Object.entries(entry).filter(([key, value]) => value !== undefined && !KNOWN_FACTS.includes(key)),
  )
}

function asColumn(raw: unknown, index: number): Column {
  if (isUnread<Column>(raw)) {
    const width = raw.width === undefined ? undefined : asWidth(raw.width)
    const column: Column = {
      key: typeof raw.key === 'string' ? raw.key.trim() : '',
      title: typeof raw.title === 'string' ? raw.title : defaultTitleFor(index),
      field: typeof raw.field === 'string' ? raw.field : '',

      ...(width === undefined ? {} : { width }),

      ...(typeof raw.total === 'boolean' ? { total: raw.total } : {}),

      ...(raw.figure === true ? { figure: true } : {}),

      ...(raw.amount === true ? { amount: true } : {}),

      ...(typeof raw.hidden === 'boolean' ? { hidden: raw.hidden } : {}),

      ...(raw.titleTyped === true ? { titleTyped: true } : {}),
    }

    return Object.assign(extraFacts(raw), column)
  }

  if (typeof raw === 'string') return { ...newColumn(index), title: raw }
  return newColumn(index)
}

export function coerceColumns(v: unknown): Column[] {
  let arr: Column[]
  if (Array.isArray(v)) {
    arr = v.map((x, i) => asColumn(x, i))
  } else if ((typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && /^\d+$/.test(v))) {
    const n = Math.max(1, Math.floor(Number(v)))
    arr = [...Array(n).keys()].map((i) => newColumn(i))
  } else {
    arr = defaultColumns()
  }

  if (arr.length < COLUMNS_MIN) arr = [newColumn(0)]
  return withKeys(arr)
}

function withAddedColumn(columns: readonly Column[]): Column[] | null {
  if (columns.length >= COLUMNS_MAX) return null
  return withKeys([...columns, newColumn(columns.length)])
}

function withoutColumn(columns: readonly Column[], index: number): Column[] | null {
  if (columns.length <= COLUMNS_MIN || index < 0 || index >= columns.length) return null
  return columns.filter((_, i) => i !== index)
}

function withMovedColumn(columns: readonly Column[], from: number, to: number): Column[] | null {
  if (from < 0 || from >= columns.length) return null
  const target = Math.max(0, Math.min(to, columns.length - 1))
  if (target === from) return null
  const l = [...columns]
  const [column] = l.splice(from, 1)
  l.splice(target, 0, column)
  return l
}

export const COLUMN_ACCESS: Pick<
  ListBinding<Column>,
  'titleOf' | 'fieldOf' | 'withTypedTitle' | 'withPickedField' | 'withoutEditorMarks'
> = {
  titleOf: (column) => column.title,
  fieldOf: (column) => column.field,
  withTypedTitle: (column, title) =>
    withEntryValue({ ...column, title }, 'titleTyped', title.trim() === '' ? undefined : true),
  withPickedField: (column, field, fieldTitle, width) => ({
    ...column,
    ...(column.titleTyped === true ? {} : { title: fieldTitle }),
    field,
    ...(width === undefined ? {} : { width }),
  }),
  withoutEditorMarks: (column) => withEntryValue(column, 'titleTyped', undefined),
}

const TEXT = 'text'
const FIGURE = 'figure'
const AMOUNT = 'amount'

// What kind of value a column or line holds: text, a figure or an amount.
interface KindMarks {
  figure?: boolean
  amount?: boolean
  total?: boolean
}

function kindOf(entry: KindMarks): string {
  if (entry.amount === true) return AMOUNT
  return entry.figure === true || entry.total === true ? FIGURE : TEXT
}

function withKind<E extends KindMarks>(entry: E, kind: string): E {
  if (kind === kindOf(entry)) return entry
  const next: E = { ...entry }
  delete next.figure
  delete next.amount
  if (kind === TEXT) delete next.total
  return Object.assign(next, kind === FIGURE ? { figure: true } : kind === AMOUNT ? { amount: true } : {})
}

export function kindChoice<E extends KindMarks>(label: string): EntryChoice<E> {
  return {
    key: 'kind',
    property: segmentProperty(
      [
        { value: TEXT, name: 'Text' },
        { value: FIGURE, name: 'Zahl' },
        { value: AMOUNT, name: 'Betrag' },
      ],
      { default: TEXT, label },
    ),
    valueOf: kindOf,
    withValue: withKind,
  }
}

const KIND = kindChoice<Column>('Spaltentyp')

export function holdsNumbers(entry: KindMarks): boolean {
  return kindOf(entry) !== TEXT
}

export function shownByKind(entry: KindMarks, value: string): string {
  const kind = kindOf(entry)
  return kind === TEXT ? value : shownFigure(value, kind === AMOUNT ? AMOUNT_DECIMALS : null)
}

const TOTAL: EntrySwitch<Column> = {
  key: 'total',
  name: 'Summe in der Fußzeile',
  short: 'Summe',
  shown: (column) => kindOf(column) !== TEXT,
  valueOf: (column) => column.total,
  withValue: (column, on) => withEntryValue(column, 'total', on),
}

const HIDDEN: EntrySwitch<Column> = {
  key: 'hidden',
  name: 'In der Maske ausblenden',
  short: 'Ausblenden',
  valueOf: (column) => column.hidden,
  withValue: (column, on) => withEntryValue(column, 'hidden', on),
}

export const COLUMNS_BINDING: ListBinding<Column, 'columns'> = {
  prop: 'columns',
  defaultTitle: DEFAULT_TITLE,
  entries: coerceColumns,
  keyOf: (column) => column.key,
  ...COLUMN_ACCESS,

  entryAdd: withAddedColumn,
  entryRemove: withoutColumn,
  entryMove: withMovedColumn,

  entryHeads: true,

  entryFlag: [TOTAL, HIDDEN],

  entryChoice: [KIND],
}

export function columnsProperty(): Property<Column[]> {
  return listProperty<Column[]>(
    coerceColumns,
    {
      default: defaultColumns(),
      label: 'Spalten',
      place: 'block',
      attribute: 'columns',
    },
    (value) => listForExport(value, COLUMNS_BINDING),
  )
}
