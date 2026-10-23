import { listProperty, type Property } from '../block/property'
import { isUnread } from '../unread'

export interface SplitColumn {
  key: string
  title: string
  field: string
  width?: number
  soonDays?: number
}

export interface SplitSort {
  field: string
  down?: true
}

export interface SplitHide {
  field: string
  value: string
}

export interface Split {
  sourceId: string
  amountColumn: string
  stockField: string
  columns: SplitColumn[]
  sort: SplitSort[]
  hideEmpty: boolean
  hide: SplitHide[]
}

export const SPLITS_PROP = 'splits'

export const SPLIT_SORT_MAX = 2

export const SPLIT_HIDE_MAX = 2

export const SOON_DAYS_MAX = 999

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

function columnFrom(raw: unknown, at: number): SplitColumn | null {
  if (!isUnread<SplitColumn>(raw)) return null
  const field = text(raw.field)
  if (field === '') return null
  const width =
    typeof raw.width === 'number' && Number.isFinite(raw.width) && raw.width > 0 ? Math.round(raw.width) : undefined
  const soon =
    typeof raw.soonDays === 'number' &&
    Number.isInteger(raw.soonDays) &&
    raw.soonDays >= 0 &&
    raw.soonDays <= SOON_DAYS_MAX
      ? raw.soonDays
      : undefined
  return {
    key: text(raw.key) || `split-${at}`,
    title: typeof raw.title === 'string' ? raw.title : '',
    field,
    ...(width === undefined ? {} : { width }),
    ...(soon === undefined ? {} : { soonDays: soon }),
  }
}

function sortFrom(raw: unknown): SplitSort | null {
  if (!isUnread<SplitSort>(raw)) return null
  const field = text(raw.field)
  if (field === '') return null
  return { field, ...(raw.down === true ? { down: true } : {}) }
}

function hideFrom(raw: unknown): SplitHide | null {
  if (!isUnread<SplitHide>(raw)) return null
  const field = text(raw.field)
  if (field === '') return null
  return { field, value: typeof raw.value === 'string' ? raw.value : '' }
}

function listed<T>(raw: unknown, read: (entry: unknown, at: number) => T | null): T[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry, at) => {
    const value = read(entry, at)
    return value === null ? [] : [value]
  })
}

function splitFrom(raw: unknown): Split | null {
  if (!isUnread<Split>(raw)) return null
  const sourceId = text(raw.sourceId)
  if (sourceId === '') return null
  const columns = listed(raw.columns, columnFrom)
  const keys = new Set<string>()
  return {
    sourceId,
    amountColumn: text(raw.amountColumn),
    stockField: text(raw.stockField),
    columns: columns.map((c, at) => {
      const key = keys.has(c.key) ? `split-${at}` : c.key
      keys.add(key)
      return { ...c, key }
    }),
    sort: listed(raw.sort, sortFrom).slice(0, SPLIT_SORT_MAX),
    hideEmpty: raw.hideEmpty === true,
    hide: listed(raw.hide, hideFrom).slice(0, SPLIT_HIDE_MAX),
  }
}

export function splitsFrom(raw: unknown): Split[] {
  return listed(raw, (entry) => splitFrom(entry)).slice(0, 1)
}

export const splitsProperty: Property<Split[]> = listProperty<Split[]>(splitsFrom, {
  default: [],
  label: 'Verteilen',
  place: 'none',
  attribute: 'splits',
})

export function newSplit(sourceId: string): Split {
  return { sourceId, amountColumn: '', stockField: '', columns: [], sort: [], hideEmpty: false, hide: [] }
}
