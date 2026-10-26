import type { JobReason, JobView, PutConfirm, RunAnswer } from '../../core/data/jobs'
import { isObject, rowsFromQueryAnswer } from '../data'
import type { RowShape } from '../positionsOverlay'
import { extractRecordAnswer } from './answer'

// A job of the line to SoftEngine: a question (GET, query) or a write (PUT),
// and what the line offers a running job.

export interface JobLine {
  ask(verb: string, body: Record<string, unknown>, fits: (raw: unknown) => boolean, onSent?: () => void): Promise<Wired>
  sent(job: Job): void
}

export interface QueryKeys {
  documentKind: string
  address: string
}

export const ALL_RECORDS: QueryKeys = { documentKind: '', address: '' }

export interface QueryAnswer {
  rows?: unknown[]
  reason?: JobReason
}

export type Wired = { kind: 'answer'; raw: unknown } | { kind: 'unanswered' } | { kind: 'unsent' }

export interface Wire {
  fits: (raw: unknown) => boolean
  settle: (wired: Wired) => void
  clock: ReturnType<typeof setTimeout>
}

export interface Job {
  view: JobView
  start: () => void
  drop: () => void
  fail: (reason: JobReason) => void
  arrived?: () => void
  heard?: (raw: unknown) => void
}

export type Hit = { kind: 'added'; row: unknown } | { kind: 'removed' }

export interface PositionsWatch {
  confirm: PutConfirm
  shape: RowShape
  body: Record<string, string>
  fields: string
  match: (rows: readonly unknown[]) => Hit | undefined
}

export function failedAnswer(reason: JobReason, raw?: unknown): RunAnswer {
  return { value: '', raw, failed: true, reason }
}

export function unconfirmedAnswer(reason: JobReason): RunAnswer {
  return { value: '', raw: undefined, confirmed: false, reason }
}

export function fitsToQuery(rows: readonly unknown[], fields: string): boolean {
  const first = rows[0]
  if (first === undefined || fields.trim() === '*') return true
  if (!isObject(first)) return false
  const key = Object.keys(first)
  return fields
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f !== '')
    .some((f) => key.some((k) => k === f || k.endsWith(`_${f}`)))
}

export function isRecordAnswer(raw: unknown): boolean {
  return rowsFromQueryAnswer(raw) === undefined && extractRecordAnswer(raw) !== undefined
}
