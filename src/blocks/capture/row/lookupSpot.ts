import { automaticColumns, entryWindowSize, sourcesRows, type Entry } from '../../lookup/lookup'
import type { Column } from '../../parts/column'
import type { CaptureRow } from './captureRow'
import { valueIn } from './cellValues'
import { targetIn, windowColumnsIn } from './context'
import { entriesIn } from './linkedRecords'

// What the lookup window of a cell shows.
export interface LookupSpot {
  spot: string

  sourceId: string

  field: string

  title: string

  columns: readonly Column[]

  entries: readonly Entry[]

  searchText: string

  width: number

  height: number
}

export function windowColumnsAt(row: CaptureRow, index: number): Column[] {
  const context = row.host.context()
  const own = windowColumnsIn(context, index)
  if (own.length > 0) return own
  const target = targetIn(context, index)
  return automaticColumns({ storageField: target.code, storageTitle: context.columns[index]?.title ?? '' })
}

// null where the cell has no source to look up in, or a linked one without rows.
export function lookupAt(row: CaptureRow, index: number): LookupSpot | null {
  const context = row.host.context()
  const column = context.columns[index]
  const target = targetIn(context, index)
  if (column === undefined || target.sourceId === '' || target.code === '') return null
  if (target.kind === 'linked' && (sourcesRows(target.sourceId)?.length ?? 0) === 0) return null
  return {
    spot: column.key,
    sourceId: target.sourceId,
    field: target.code,
    title: column.title,
    columns: windowColumnsIn(context, index),
    entries: entriesIn(row, context, index),
    searchText: valueIn(row, context, index),
    ...entryWindowSize(column, windowColumnsAt(row, index).length),
  }
}
