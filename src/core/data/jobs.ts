import type { RelationAnswer } from './relations'

export type JobArt = 'get' | 'query' | 'put'

export type JobState = 'queued' | 'sent' | 'done' | 'unconfirmed' | 'failed' | 'dropped'

export type JobReason =
  | 'nicht verbunden'
  | 'SoftEngine antwortet nicht'
  | 'keine Rückmeldung von SoftEngine'
  | 'gesendet, ohne Rückmeldung'
  | `von SoftEngine abgelehnt: ${string}`
  | 'veraltet'
  | 'mehr verteilte Zeilen als Plätze'

export const ANSWER_WAIT_MS = 20_000

export const NOT_CONNECTED: JobReason = 'nicht verbunden'
export const NO_ANSWER: JobReason = 'SoftEngine antwortet nicht'
export const NO_CONFIRMATION: JobReason = 'keine Rückmeldung von SoftEngine'
// A write SoftEngine took without a word: neither refused nor confirmed.
export const NOT_ACKNOWLEDGED: JobReason = 'gesendet, ohne Rückmeldung'
export const STALE: JobReason = 'veraltet'
// More rows distributed than a step carries: it would lose the rest.
export const TOO_MANY_PICKS: JobReason = 'mehr verteilte Zeilen als Plätze'

const REFUSED = 'von SoftEngine abgelehnt: '

export function refused(text: string): JobReason {
  return `${REFUSED}${text}`
}

export function refusalText(reason: JobReason): string | undefined {
  return reason.startsWith(REFUSED) ? reason.slice(REFUSED.length) : undefined
}

export interface OpenDocument {
  kind: string
  number: string
  year: string
  archive: string
}

export interface PutConfirm {
  document: OpenDocument
  kind: 'added' | 'removed'
  sourceId: string
  expectedArticle?: string
  expectedQuantity?: string
  row?: unknown
}

export interface RunOptions {
  recordAnswer?: boolean
  origin?: string
  generation?: number
  confirm?: PutConfirm
  sendOnly?: boolean
  // A GET_RELATION in selib's shape, with ALIAS "SEGet" and ALS_ARRAY "false".
  selibGet?: boolean
}

export interface RunAnswer extends RelationAnswer {
  reason?: JobReason
  confirmed?: boolean
  record?: string
  row?: Readonly<Record<string, string>>
  gone?: boolean
}

export interface JobView {
  id: number
  art: JobArt
  origin: string
  generation: number
  question: string
  state: JobState
  reason?: JobReason
  queuedAt: number
  sentAt?: number
  endedAt?: number
  record?: string
  gone?: boolean
}
