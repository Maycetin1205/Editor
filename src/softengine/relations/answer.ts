import { fieldRead, isObject, rowsFromQueryAnswer, type JsonObject } from '../data'

function parsed(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

function answerObject(raw: unknown): JsonObject | undefined {
  const value = parsed(raw)
  return isObject(value) && !Array.isArray(value) ? value : undefined
}

function scalar(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const t = value.trim()
    return t === '' ? undefined : t
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

const NESTED_KEYS = [
  'RESULT',
  'result',
  'PINDEX',
  'pindex',
  'INDEX',
  'index',
  '0_10',
  'KEY',
  'key',
  'ID',
  'id',
  'VALUE',
  'value',
] as const

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

export function answersRelation(raw: unknown): boolean {
  const value = answerObject(raw)
  if (value === undefined || !('RESULT' in value || 'result' in value)) return false
  const result = value.RESULT ?? value.result
  if (isObject(result) && !Array.isArray(result) && 'ERRCODE' in result) return false
  return rowsFromQueryAnswer(value) === undefined
}

export function refusalOf(raw: unknown): string | undefined {
  const value = answerObject(raw)
  if (value === undefined) return undefined
  for (const place of [value, value.RESULT, value.result]) {
    if (!isObject(place)) continue
    const code = scalar(place.ERRCODE)
    if (code !== undefined && code !== '0') return scalar(place.ERRMSG) ?? `Fehler ${code}`
  }
  return undefined
}

export function resultList(raw: unknown): unknown[] | undefined {
  const value = answerObject(raw)
  const result = value === undefined ? undefined : parsed(value.RESULT ?? value.result)
  return Array.isArray(result) && result.every(isObject) ? result : undefined
}

export function resultFromAnswer(raw: unknown): string {
  const value = answerObject(raw)
  if (value === undefined) return ''
  return firstScalar(value.RESULT ?? value.result, 0) ?? ''
}

const RECORD_KEY = ['RESULT', 'result'] as const

export function extractRecordAnswer(raw: unknown, depth = 0): string | undefined {
  if (depth > 12) return undefined
  const value = typeof raw === 'string' ? parsed(raw) : raw
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractRecordAnswer(entry, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!isObject(value)) return undefined
  for (const key of RECORD_KEY) {
    const found = value[key]
    if (typeof found === 'string') return found
    if (typeof found === 'number' || typeof found === 'boolean') return String(found)
  }
  for (const entry of Object.values(value)) {
    const found = extractRecordAnswer(entry, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

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
