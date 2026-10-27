// How many rows fit and which of them a page shows. Pure figures; the
// measuring of the body lives in bodyMeasure.

export const ROWS_HEIGHT = 36

export const SUBLINE_HEIGHT = 20

export const WITHOUT_MEASUREMENT = 10

function headRows(headHeight: number, tick: number): number {
  return Math.max(1, Math.floor(headHeight / tick))
}

function fittingRows(bodyHeight: number, heads: number, rowsHeight: number, sub: number): number {
  return Math.max(1, Math.floor((bodyHeight - heads * rowsHeight) / (rowsHeight + sub)))
}

export interface RowMetrics {
  fit: number
}

export function rowMetrics(bodyHeight: number, headHeight: number, tick: number, sub: number): RowMetrics {
  return { fit: fittingRows(bodyHeight, headRows(headHeight, tick), tick, sub) }
}

export function rulerTicks(fit: number | null, rendered: number): number | null {
  if (fit === null) return null
  return Math.max(0, fit - rendered)
}

interface Split {
  pages: number

  page: number

  rows: number[]
}

interface SplitQuestion {
  visible: readonly number[]

  showsRows: boolean
  perPage: number

  wantedPage: number
}

export function scrollSplit({ visible, showsRows }: SplitQuestion): Split {
  return { pages: 1, page: 0, rows: showsRows ? [...visible] : [] }
}

export function pagesSplit({ visible, showsRows, perPage, wantedPage }: SplitQuestion): Split {
  const pages = showsRows ? Math.max(1, Math.ceil(visible.length / perPage)) : 1

  const page = Math.min(Math.max(wantedPage, 0), pages - 1)
  if (!showsRows) return { pages, page, rows: [] }
  return { pages, page, rows: [...visible.slice(page * perPage, (page + 1) * perPage)] }
}
