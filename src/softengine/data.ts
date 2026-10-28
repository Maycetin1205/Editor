import type { RuntimeSource } from '../core/data/dataSources'
import { runtimeDeliveryFrom } from '../core/data/deliveries/deliveries'
import { isUnread } from '../core/unread'
import { fetchedRowsFor } from './fetchedRows'

export type JsonObject = Record<string, unknown>

export function isObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null
}

export function sourceFromList(list: unknown, id: string): RuntimeSource | undefined {
  if (!Array.isArray(list) || id === '') return undefined
  for (const entry of list) {
    if (!isObject(entry) || entry.id !== id) continue
    if (typeof entry.name !== 'string' || typeof entry.tableId !== 'string') continue
    return {
      id,
      name: entry.name,
      tableId: entry.tableId,
      recordField: typeof entry.recordField === 'string' ? entry.recordField : '',
      fields: Array.isArray(entry.fields)
        ? entry.fields.filter((code): code is string => typeof code === 'string')
        : [],
      delivery: runtimeDeliveryFrom(entry),
    }
  }
  return undefined
}

export function rowsFromQueryAnswer(raw: unknown): unknown[] | undefined {
  let answer = raw
  if (typeof answer === 'string') {
    try {
      answer = JSON.parse(answer)
    } catch {
      return undefined
    }
  }
  if (!isObject(answer) || Array.isArray(answer)) return undefined

  const listName = answer.LISTENNAME
  const elementName = answer.ELEMENTNAME
  if (typeof listName === 'string' && typeof elementName === 'string') {
    const named = answer[listName]
    if (isObject(named)) {
      const rows = named[elementName]
      if (Array.isArray(rows)) return rows.filter(isObject)
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
  const row = contents.find((v): v is unknown[] => Array.isArray(v))
  if (row) return row.filter(isObject)
  const single = contents.find(isObject)
  return single === undefined ? [] : [single]
}

export function asTrimmedString(v: unknown): string {
  if (v == null) return ''
  if (isUnread<{ WERT: string }>(v)) {
    const content = v.WERT
    return content == null || typeof content === 'object' ? '' : String(content).trim()
  }
  return String(v).trim()
}

function jsonOrNothing(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function rowsOfEntry(entry: unknown): unknown[] {
  if (!isObject(entry)) return Array.isArray(entry) ? entry : []
  const candidates = [
    entry.Zeilen,
    entry.zeilen,
    entry.Saetze,
    entry.saetze,
    entry.Rows,
    entry.rows,
    entry.Daten,
    entry.daten,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
    if (typeof c === 'string') {
      const parsed = jsonOrNothing(c)
      if (Array.isArray(parsed)) return parsed
    }
  }
  return []
}

function sameAlias(a: unknown, alias: string): boolean {
  return asTrimmedString(a).toLowerCase() === alias.trim().toLowerCase()
}

function varBlockOf(data: JsonObject): JsonObject | undefined {
  for (const key of ['Var', 'VAR', 'var']) {
    const block = data[key]
    if (isObject(block)) return block
  }
  return undefined
}

function openRecordRows(seData: unknown, tableId: string): unknown[] {
  if (!isObject(seData) || !isObject(seData.Daten)) return []
  const id = tableId.trim()
  if (id === '') return []
  const varBlock = varBlockOf(seData.Daten)
  if (!varBlock) return []

  const record: JsonObject = {}
  const window = varBlock.WINDOW_VARIABLE ?? varBlock.Window_Variable
  if (isObject(window)) {
    const prefix = id.toUpperCase() + '_'
    for (const key of Object.keys(window)) {
      if (key.toUpperCase().startsWith(prefix)) record[key] = window[key]
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

function loopRows(data: JsonObject, alias: string): unknown[] {
  const sfl = data.SEFileLoop
  if (Array.isArray(sfl)) {
    for (const entry of sfl) {
      if (isObject(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias))) {
        const rows = rowsOfEntry(entry)
        if (rows.length > 0) return rows
      }
    }
  } else if (isObject(sfl)) {
    for (const key of Object.keys(sfl)) {
      const entry = sfl[key]
      if (
        sameAlias(key, alias) ||
        (isObject(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias)))
      ) {
        const rows = rowsOfEntry(entry)
        if (rows.length > 0) return rows
      }
    }
  }
  return []
}

function apiCallRows(data: JsonObject, alias: string): unknown[] {
  for (const key of ['ErpApiCall', 'ERPAPICALL', 'erpapicall']) {
    const api = data[key]
    if (!isObject(api)) continue
    for (const entry of Object.keys(api)) {
      if (!sameAlias(entry, alias)) continue
      const rows = rowsOfEntry(api[entry])
      if (rows.length > 0) return rows
    }
  }
  return []
}

function tableRows(data: JsonObject, alias: string, tableId: string): unknown[] {
  const tab = data.Tabellen
  if (!isObject(tab)) return []
  const keys = [alias, alias.toUpperCase(), alias.toLowerCase(), tableId]
  for (const key of keys) {
    if (key !== '' && key in tab) {
      const rows = rowsOfEntry(tab[key])
      if (rows.length > 0) return rows
    }
  }
  for (const key of Object.keys(tab)) {
    if (sameAlias(key, alias)) {
      const rows = rowsOfEntry(tab[key])
      if (rows.length > 0) return rows
    }
  }
  return []
}

function maskRows(data: JsonObject, alias: string): unknown[] {
  const masks = data.Masken
  if (!isObject(masks)) return []
  for (const key of Object.keys(masks)) {
    const entry = masks[key]
    if (sameAlias(key, alias) && isObject(entry) && !Array.isArray(entry)) return [entry]
  }
  return []
}

const PUSHED_LISTS = [loopRows, apiCallRows, tableRows, maskRows]

function pushedRows(seData: unknown, alias: string, tableId: string, openRecord: boolean): unknown[] {
  if (!isObject(seData) || !isObject(seData.Daten)) return []
  if (openRecord) return openRecordRows(seData, tableId)
  for (const read of PUSHED_LISTS) {
    const rows = read(seData.Daten, alias, tableId)
    if (rows.length > 0) return rows
  }
  return []
}

export function rowsInData(source: RuntimeSource, seData: unknown): unknown[] {
  const delivery = source.delivery
  if (delivery.kind !== 'push') return fetchedRowsFor(source.name) ?? []
  return pushedRows(seData, source.name, source.tableId, delivery.openRecord)
}

export function dataFromContent(raw: unknown): JsonObject | undefined {
  let data = raw
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return undefined
    }
  }
  if (!isObject(data) || !isObject(data.Daten)) return undefined
  const block = data.Daten
  if (!block.SEFileLoop && !block.Tabellen && !block.ErpApiCall && !block.Masken && !varBlockOf(block)) {
    return undefined
  }
  return block
}

export function messagesContent(eventData: unknown): unknown {
  let d = eventData
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d)
    } catch {
      return undefined
    }
  }
  if (!isObject(d) || !isObject(d.MSG)) return undefined
  return d.MSG.DATA
}
