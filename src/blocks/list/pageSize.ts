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

function rowMetrics(bodyHeight: number, headHeight: number, tick: number, sub: number): RowMetrics {
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

export const WITHOUT_BODY = -1

export interface MeasureTarget {
  hasAttribute(name: string): boolean
  renderRoot: { querySelector(selection: string): Element | null }
}

interface BodyMeasure {
  metrics: RowMetrics | null

  height: number

  head: number
}

export function bodyHeight(target: MeasureTarget): number {
  if (!target.hasAttribute('fills')) return WITHOUT_BODY
  const body = target.renderRoot.querySelector('.body')
  return body instanceof HTMLElement ? body.clientHeight : WITHOUT_BODY
}

export function headHeight(target: MeasureTarget): number {
  const head = target.renderRoot.querySelector('.head')
  return head instanceof HTMLElement ? head.offsetHeight : 0
}

export function measuredMetrics(target: MeasureTarget, tick: number, sub = 0): BodyMeasure {
  const height = bodyHeight(target)
  if (height === WITHOUT_BODY) return { metrics: null, height, head: 0 }
  const head = headHeight(target)
  return { metrics: rowMetrics(height, head, tick, sub), height, head }
}

export function observeBody(target: MeasureTarget, onChange: () => void): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null
  const body = target.renderRoot.querySelector('.body')
  if (!body) return null
  const observers = new ResizeObserver(onChange)
  observers.observe(body)
  return observers
}
