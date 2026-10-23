import type { RuntimeSource } from '../core/data/dataSources'
import { POSITIONS_QUERY } from '../core/data/positions'
import { onSeArrival, reportTrigger, seWindow } from './bridge'
import { isObject, rowsOfSource, sourceFromList } from './data'

type Row = Readonly<Record<string, string>>

interface Overlay {
  added: Row[]
  away: Set<string>
}

const overlays = new Map<string, Overlay>()

const wiring = { on: false }

function printOf(row: unknown): string {
  if (typeof row !== 'object' || row === null) return String(row)
  return JSON.stringify(Object.entries(row).sort(([a], [b]) => (a < b ? -1 : 1)))
}

function wire(): void {
  if (wiring.on) return
  wiring.on = true
  onSeArrival(() => {
    if (overlays.size === 0) return
    overlays.clear()
    reportTrigger()
  })
}

function overlayOf(sourceId: string): Overlay {
  wire()
  let overlay = overlays.get(sourceId)
  if (!overlay) {
    overlay = { added: [], away: new Set() }
    overlays.set(sourceId, overlay)
  }
  return overlay
}

export function overlaid(source: RuntimeSource, rows: unknown[]): unknown[] {
  const overlay = overlays.get(source.id)
  if (!overlay) return rows
  const kept = overlay.away.size === 0 ? rows : rows.filter((row) => !overlay.away.has(printOf(row)))
  return overlay.added.length === 0 ? kept : [...kept, ...overlay.added]
}

function sourceOf(sourceId: string): RuntimeSource | undefined {
  return sourceFromList(seWindow().FF_DATA_SOURCES, sourceId)
}

export function deliveredRows(sourceId: string): unknown[] {
  const source = sourceOf(sourceId)
  return source ? rowsOfSource(source, seWindow().SEDATA) : []
}

export function shownRows(sourceId: string): unknown[] {
  const source = sourceOf(sourceId)
  return source ? overlaid(source, rowsOfSource(source, seWindow().SEDATA)) : []
}

export interface RowShape {
  prefix: string
  codes: string[]
}

const FIELD_KEY = /^(.*?)(\d+_\d+)$/

const FIELD_CODE = /^\d+_\d+$/

export function rowShape(sourceId: string): RowShape {
  const source = sourceOf(sourceId)
  if (!source) return { prefix: '', codes: [] }
  const first = rowsOfSource(source, seWindow().SEDATA)[0]
  const keys = typeof first === 'object' && first !== null ? Object.keys(first) : []
  const matches = keys.map((key) => FIELD_KEY.exec(key)).filter((m): m is RegExpExecArray => m !== null)
  return {
    prefix: matches[0]?.[1] ?? `${source.tableId}_`,
    codes: matches.length > 0 ? matches.map((m) => m[2]) : source.fields.filter((code) => FIELD_CODE.test(code)),
  }
}

export function shapedRow(answered: unknown, shape: RowShape): Row {
  const row: Record<string, string> = {}
  for (const code of shape.codes) row[`${shape.prefix}${code}`] = ''
  if (!isObject(answered)) return row
  for (const [key, value] of Object.entries(answered)) {
    if (!key.startsWith(POSITIONS_QUERY.prefix)) continue
    const code = key.slice(POSITIONS_QUERY.prefix.length)
    if (FIELD_CODE.test(code) && (typeof value === 'string' || typeof value === 'number')) {
      row[`${shape.prefix}${code}`] = String(value)
    }
  }
  return row
}

export function plainRow(delivered: unknown): Row {
  const row: Record<string, string> = {}
  if (!isObject(delivered)) return row
  for (const [key, value] of Object.entries(delivered)) {
    if (typeof value === 'string' || typeof value === 'number') row[key] = String(value)
  }
  return row
}

export function addPosition(sourceId: string, row: Row): void {
  overlayOf(sourceId).added.push(row)
}

export function dropPosition(sourceId: string, row: unknown): void {
  const overlay = overlayOf(sourceId)
  const print = printOf(row)
  const at = overlay.added.findIndex((added) => added === row || printOf(added) === print)
  if (at >= 0) overlay.added.splice(at, 1)
  else overlay.away.add(print)
}
