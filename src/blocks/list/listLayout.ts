import type { Calculation } from '../../core/data/calculation'
import { figureOf, type Column, type ColumnView } from '../parts/column'
import type { RowLayout } from '../parts/cell'
import type { RowsFrom } from './sourceRows'

// Which columns a record shows in its row and which in the grey line under it,
// and whether the list shows rows at all. No DOM here.

// A column the builder hid, or the operator put away, stays out of the mask;
// the editor shows all. One column always stays.
export function columnsView(
  columns: readonly Column[],
  showAll: boolean,
  awayByOperator: ReadonlySet<string> = new Set(),
): ColumnView {
  const away = (s: Column): boolean => s.hidden === true || awayByOperator.has(s.key)
  if (showAll || !columns.some(away)) {
    return { columns, slots: columns.map((_, i) => i) }
  }
  const shown: Column[] = []
  const slots: number[] = []
  columns.forEach((s, i) => {
    if (away(s)) return
    shown.push(s)
    slots.push(i)
  })
  if (shown.length === 0 && columns.length > 0) return { columns: [columns[0]], slots: [0] }
  return { columns: shown, slots }
}

export function rowLayoutOf(
  columns: readonly Column[],
  calculations: readonly Calculation[],
  visible: ColumnView,
  greyLine: Iterable<[number, number]>,
): RowLayout {
  const figures = columns.map((column) => figureOf(column, calculations))
  const under = new Map<number, { column: Column; slot: number }>()
  for (const [anchor, slot] of greyLine) {
    under.set(anchor, { column: columns[slot], slot })
  }
  if (under.size === 0) return { main: visible, under, figures }
  const grey = new Set([...under.values()].map((sub) => sub.slot))
  const main: { columns: Column[]; slots: number[] } = { columns: [], slots: [] }
  visible.columns.forEach((column, i) => {
    if (grey.has(visible.slots[i])) return
    main.columns.push(column)
    main.slots.push(visible.slots[i])
  })
  return { main, under, figures }
}

interface ListShowQuestion {
  preview: boolean

  rowsFrom: RowsFrom

  columns: readonly Column[]

  rowCount: number
}

interface ListShows {
  rows: boolean

  empty: boolean
}

export function listEmptyState(question: ListShowQuestion): ListShows {
  if (question.preview) return { rows: false, empty: false }

  const anyColumnBound = question.columns.some((column) => column.field.trim() !== '')
  const empty = question.rowCount === 0 || (question.rowsFrom === 'source' && !anyColumnBound)
  return { rows: true, empty }
}
