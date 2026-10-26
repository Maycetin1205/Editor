import { rulerTicks, WITHOUT_MEASUREMENT, scrollSplit, pagesSplit, ROWS_HEIGHT, type RowMetrics } from './pageSize'
import { sortIndices, totalText } from './sorting'
import type { Column, Figure } from '../parts/column'
import { columnsTemplate, type ColumnsGrid } from './columnWidth'
import { rowFits } from '../parts/cellSearch'

// What the table shows: the columns grid, the rows of the page after search
// and sorting, the page count and the sums. No DOM here.

interface ViewQuestion {
  columns: readonly Column[]

  figures: readonly (Figure | null)[]

  rendered?: readonly Column[]
  slots?: readonly number[]

  widthOf?: (index: number) => number | undefined

  showsRows: boolean

  empty: boolean

  dataRows: readonly string[][]
  searchText: string

  sortColumn: number
  sortAscending: boolean

  wantedPage: number

  measured: RowMetrics | null

  takenRows: number

  valueAt: (rawIndex: number, column: number) => string

  paging: boolean
}

export interface TableRenderModel {
  cols: ColumnsGrid

  tick: number

  showsRows: boolean
  empty: boolean

  total: number
  records: number
  searchesActive: boolean
  paging: boolean
  pageCount: number
  page: number

  rows: readonly number[]

  rulerTicks: number | null

  totals: readonly { title: string; text: string }[]
}

function totalsOf(question: ViewQuestion, visible: readonly number[]): { title: string; text: string }[] {
  const out: { title: string; text: string }[] = []
  question.columns.forEach((column, i) => {
    if (column.total !== true) return
    const text = totalText(
      visible.map((row) => question.valueAt(row, i)),
      question.figures[i]?.decimals ?? null,
    )
    if (text !== '') out.push({ title: column.title, text })
  })
  return out
}

function viewRows(question: ViewQuestion): string[][] {
  return question.dataRows.map((_, row) => question.columns.map((__, s) => question.valueAt(row, s)))
}

function visibleIndices(question: ViewQuestion): number[] {
  const rows = viewRows(question)
  const filtered = fittingIndices(rows, question.searchText)
  if (question.sortColumn < 0) return filtered
  const sortRows = filtered.map((i) => rows[i])
  return sortIndices(sortRows, question.sortColumn, question.sortAscending).map((k) => filtered[k])
}

export function tableRenderModel(question: ViewQuestion): TableRenderModel {
  const rendered = question.rendered ?? question.columns
  const slots = question.slots ?? rendered.map((_, i) => i)
  const cols: ColumnsGrid = {
    gridTemplateColumns: columnsTemplate(rendered, (j) => question.widthOf?.(slots[j] ?? j)),
  }

  const tick = ROWS_HEIGHT

  const showsRows = question.showsRows

  const empty = question.takenRows > 0 ? false : question.empty

  const allVisible = visibleIndices(question)

  const taken = question.takenRows
  const measuredFit = question.measured === null ? null : Math.max(1, question.measured.fit - taken)
  const perPage = measuredFit ?? Math.max(1, WITHOUT_MEASUREMENT - taken)

  const free = question.measured === null ? null : Math.max(0, question.measured.fit - taken)
  const splitQuestion = {
    visible: allVisible,
    showsRows,
    perPage,
    wantedPage: question.wantedPage,
  }
  const { pages, page, rows } = question.paging ? pagesSplit(splitQuestion) : scrollSplit(splitQuestion)
  return {
    cols,
    tick,
    showsRows,
    empty,
    total: allVisible.length,
    records: question.dataRows.length,
    searchesActive: question.searchText.trim() !== '',
    paging: question.paging,
    pageCount: pages,
    page,
    rows,

    rulerTicks: rulerTicks(free, rows.length),

    totals: totalsOf(question, allVisible),
  }
}

function fittingIndices(rows: readonly (readonly string[])[], searchText: string): number[] {
  const out: number[] = []
  rows.forEach((z, i) => {
    if (rowFits(z, searchText)) out.push(i)
  })
  return out
}
