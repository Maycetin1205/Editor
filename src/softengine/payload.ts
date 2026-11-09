import type { PushPath } from '@/model/sourceKinds'
import { fieldRead } from './fields'

// Reads what SoftEngine sends: the data it pushes when a mask opens and the
// answers to questions. SoftEngine is loose about shapes (a list here, an
// object there, JSON as text in between), so every reader takes them all.

export type JsonObject = Record<string, unknown>

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null
}

function parsed(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

function asObject(raw: unknown): JsonObject | undefined {
  const value = parsed(raw)
  return isObject(value) && !Array.isArray(value) ? value : undefined
}

export function asTrimmedString(value: unknown): string {
  if (value == null) return ''
  if (isObject(value)) {
    const content = value.WERT
    return content == null || typeof content === 'object' ? '' : String(content).trim()
  }
  return String(value).trim()
}

// ----- pushed data -----

function varBlockOf(data: JsonObject): JsonObject | undefined {
  for (const key of ['Var', 'VAR', 'var']) {
    const block = data[key]
    if (isObject(block)) return block
  }
  return undefined
}

// The block "Daten" out of what SoftEngine hands the mask; undefined when the
// content is something else (an answer to a question).
export function dataFromContent(raw: unknown): JsonObject | undefined {
  const data = parsed(raw)
  if (!isObject(data) || !isObject(data.Daten)) return undefined
  const block = data.Daten
  if (!block.SEFileLoop && !block.Tabellen && !block.ErpApiCall && !block.Masken && !varBlockOf(block)) return undefined
  return block
}

// The content of a window message from SoftEngine: {MSG: {DATA: ...}}.
export function messageContent(eventData: unknown): unknown {
  const data = parsed(eventData)
  if (!isObject(data) || !isObject(data.MSG)) return undefined
  return data.MSG.DATA
}

function rowsOfEntry(entry: unknown): unknown[] {
  if (!isObject(entry)) return []
  if (Array.isArray(entry)) return entry
  for (const key of ['Zeilen', 'zeilen', 'Saetze', 'saetze', 'Rows', 'rows', 'Daten', 'daten']) {
    const candidate = entry[key]
    if (Array.isArray(candidate)) return candidate
    if (typeof candidate === 'string') {
      const list = parsed(candidate)
      if (Array.isArray(list)) return list
    }
  }
  return []
}

const sameAlias = (a: unknown, alias: string): boolean =>
  asTrimmedString(a).toLowerCase() === alias.trim().toLowerCase()

function loopRows(data: JsonObject, alias: string): unknown[] | undefined {
  const loop = data.SEFileLoop
  if (Array.isArray(loop)) {
    for (const entry of loop) {
      if (isObject(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias))) return rowsOfEntry(entry)
    }
  } else if (isObject(loop)) {
    for (const key of Object.keys(loop)) {
      const entry = loop[key]
      if (sameAlias(key, alias) || (isObject(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias)))) {
        return rowsOfEntry(entry)
      }
    }
  }
  return undefined
}

function apiCallRows(data: JsonObject, alias: string): unknown[] | undefined {
  for (const key of ['ErpApiCall', 'ERPAPICALL', 'erpapicall']) {
    const api = data[key]
    if (!isObject(api)) continue
    for (const entry of Object.keys(api)) {
      if (sameAlias(entry, alias)) return rowsOfEntry(api[entry])
    }
  }
  return undefined
}

function tableRows(data: JsonObject, alias: string, table: string): unknown[] | undefined {
  const tables = data.Tabellen
  if (!isObject(tables)) return undefined
  for (const key of Object.keys(tables)) {
    if (sameAlias(key, alias) || (table !== '' && key === table)) return rowsOfEntry(tables[key])
  }
  return undefined
}

function maskRows(data: JsonObject, alias: string): unknown[] | undefined {
  const masks = data.Masken
  if (!isObject(masks)) return undefined
  for (const key of Object.keys(masks)) {
    const entry = masks[key]
    if (sameAlias(key, alias) && isObject(entry) && !Array.isArray(entry)) return [entry]
  }
  return undefined
}

// The record open in SoftEngine: put together from the window variables
// ("ADR_2_8") and the block of the table itself.
function openRecordRows(data: JsonObject, table: string): unknown[] | undefined {
  const id = table.trim()
  const varBlock = varBlockOf(data)
  if (id === '' || !varBlock) return undefined
  const record: JsonObject = {}
  const windowVars = varBlock.WINDOW_VARIABLE ?? varBlock.Window_Variable
  if (isObject(windowVars)) {
    const prefix = id.toUpperCase() + '_'
    for (const key of Object.keys(windowVars)) {
      if (key.toUpperCase().startsWith(prefix)) record[key] = windowVars[key]
    }
  }
  const own = varBlock[id] ?? varBlock[id.toUpperCase()]
  if (isObject(own)) {
    for (const key of Object.keys(own)) {
      if (asTrimmedString(own[key]) !== '' || !(key in record)) record[key] = own[key]
    }
  }
  return Object.keys(record).length === 0 ? [] : [record]
}

// The rows SoftEngine pushed for a source; undefined when the data hold no
// such list. A list may also arrive at another place than its kind says, so
// the other places are looked at as well.
export function pushedRows(data: unknown, path: PushPath, alias: string, table: string): unknown[] | undefined {
  if (!isObject(data)) return undefined
  if (path === 'Var') return openRecordRows(data, table)
  return (
    loopRows(data, alias) ?? apiCallRows(data, alias) ?? tableRows(data, alias, table) ?? maskRows(data, alias) ?? undefined
  )
}

// ----- answers -----

// The rows of an answer to an ERP query: {LISTENNAME, ELEMENTNAME, <list>: {<element>: [...]}}
// or an object with a key that ends in LISTE.
export function rowsFromQueryAnswer(raw: unknown): unknown[] | undefined {
  const answer = asObject(raw)
  if (!answer) return undefined
  const listName = answer.LISTENNAME
  const elementName = answer.ELEMENTNAME
  if (typeof listName === 'string' && typeof elementName === 'string') {
    const named = answer[listName]
    if (isObject(named)) {
      const rows = named[elementName]
      if (Array.isArray(rows)) return rows.filter(isObject)
      if (isObject(rows)) return [rows]
      return []
    }
  }
  const key = Object.keys(answer).find((k) => /LISTE$/i.test(k))
  if (key === undefined) return undefined
  const list = answer[key]
  if (Array.isArray(list)) return list.filter(isObject)
  if (!isObject(list)) return []
  const contents = Object.entries(list)
    .filter(([k]) => k !== 'SAT' && k !== 'TFELD')
    .map(([, v]) => v)
  const many = contents.find((v): v is unknown[] => Array.isArray(v))
  if (many) return many.filter(isObject)
  const single = contents.find(isObject)
  return single === undefined ? [] : [single]
}

// Whether the rows answer the query that asked for these fields: a late
// answer to another query must not be taken for this one.
export function fitsToQuery(rows: readonly unknown[], fields: string): boolean {
  const first = rows[0]
  if (first === undefined || fields.trim() === '*') return true
  if (!isObject(first)) return false
  const keys = Object.keys(first)
  return fields
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f !== '')
    .some((f) => keys.some((k) => k === f || k.endsWith(`_${f}`)))
}

function scalar(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const t = value.trim()
    return t === '' ? undefined : t
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

const NESTED_KEYS = ['RESULT', 'result', 'PINDEX', 'pindex', 'INDEX', 'index', '0_10', 'KEY', 'key', 'ID', 'id', 'VALUE', 'value']

function firstScalar(value: unknown, depth: number): string | undefined {
  if (depth > 12) return undefined
  const direct = scalar(value)
  if (direct !== undefined) return direct
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstScalar(entry, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!isObject(value)) return undefined
  for (const key of NESTED_KEYS) {
    if (!(key in value)) continue
    const found = firstScalar(value[key], depth + 1)
    if (found !== undefined) return found
  }
  for (const entry of Object.values(value)) {
    const found = firstScalar(entry, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

// An answer to a relation: it carries RESULT and is no list of a query.
export function answersRelation(raw: unknown): boolean {
  const value = asObject(raw)
  if (value === undefined || !('RESULT' in value || 'result' in value)) return false
  const result = value.RESULT ?? value.result
  if (isObject(result) && !Array.isArray(result) && 'ERRCODE' in result) return false
  return rowsFromQueryAnswer(value) === undefined
}

// What SoftEngine says when it refuses: the error text, else undefined.
export function refusalOf(raw: unknown): string | undefined {
  const value = asObject(raw)
  if (value === undefined) return undefined
  for (const place of [value, value.RESULT, value.result]) {
    if (!isObject(place)) continue
    const code = scalar(place.ERRCODE)
    if (code !== undefined && code !== '0') return scalar(place.ERRMSG) ?? `Fehler ${code}`
  }
  return undefined
}

// The value of an answer: RESULT, or the first value found inside it.
export function resultFromAnswer(raw: unknown): string {
  const value = asObject(raw)
  if (value === undefined) return scalar(raw) ?? ''
  return firstScalar(value.RESULT ?? value.result, 0) ?? ''
}

// RESULT as a list of records, when the relation answers with several.
export function resultList(raw: unknown): unknown[] | undefined {
  const value = asObject(raw)
  const result = value === undefined ? undefined : parsed(value.RESULT ?? value.result)
  return Array.isArray(result) && result.every(isObject) ? result : undefined
}

// A named field anywhere inside an answer.
export function fieldFromAnswer(raw: unknown, code: string, depth = 0): string {
  if (code.trim() === '' || depth > 12) return ''
  const value = typeof raw === 'string' ? parsed(raw) : raw
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = fieldFromAnswer(entry, code, depth + 1)
      if (found !== '') return found
    }
    return ''
  }
  if (!isObject(value)) return ''
  const direct = fieldRead(value, code)
  if (direct !== '') return direct
  for (const entry of Object.values(value)) {
    const found = fieldFromAnswer(entry, code, depth + 1)
    if (found !== '') return found
  }
  return ''
}

// The rows a GET_RELATION delivers for a source: one row per record of the
// answer, or one row with the plain value in the first field.
export function rowsFromRelationAnswer(value: string, raw: unknown, fields: readonly string[]): Record<string, string>[] {
  const rowOf = (plain: string, from: unknown): Record<string, string> => {
    const row: Record<string, string> = {}
    fields.forEach((code, i) => {
      const named = fieldFromAnswer(from, code)
      row[code] = named !== '' ? named : i === 0 ? plain : ''
    })
    return row
  }
  const list = resultList(raw)
  const rows = list === undefined ? [rowOf(value, raw)] : list.map((entry) => rowOf('', entry))
  return rows.filter((row) => Object.values(row).some((v) => v !== ''))
}
