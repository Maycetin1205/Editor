import { rowMetrics, type RowMetrics } from './pageSize'

// Reads the drawn body and head, so the page size follows the real height.

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
