import type { RuntimeQuery } from '../../core/data/deliveries/message'
import {
  ANSWER_WAIT_MS,
  NO_ANSWER,
  NO_CONFIRMATION,
  NOT_ACKNOWLEDGED,
  NOT_CONNECTED,
  STALE,
  refused,
  type JobArt,
  type JobReason,
  type JobState,
  type JobView,
  type PutConfirm,
  type RunAnswer,
  type RunOptions,
} from '../../core/data/jobs'
import {
  POSITION_FIELDS,
  POSITIONS_QUERY,
  documentIndex,
  knownPositions,
  positionGone,
  positionsAsked,
  writtenPosition,
} from '../../core/data/positions'
import type { RuntimeRelation } from '../../core/data/relations'
import { onSeAnswer, onSeArrival, reportTrigger, seWindow, startSe, writeGoesOut } from '../bridge'
import { fieldRead, isObject, rowsFromQueryAnswer } from '../data'
import {
  addPosition,
  deliveredRows,
  dropPosition,
  plainRow,
  rowShape,
  shapedRow,
  shownRows,
  type RowShape,
} from '../positionsOverlay'
import { warn } from '../warning'
import { answersRelation, extractRecordAnswer, refusalOf, resultFromAnswer } from './answer'

const WRITE_WAIT_MS = 10_000

const PAUSE_CHECK_MS = 1_000

const FIRST_READ_MS = 150
const READ_AGAIN_MS = 500

export interface QueryKeys {
  documentKind: string
  address: string
}

const ALL_RECORDS: QueryKeys = { documentKind: '', address: '' }

export interface QueryAnswer {
  rows?: unknown[]
  reason?: JobReason
}

type Wired =
  | { kind: 'answer'; raw: unknown }
  | { kind: 'unanswered' }
  | { kind: 'unsent' }

interface Wire {
  fits: (raw: unknown) => boolean
  settle: (wired: Wired) => void
  clock: ReturnType<typeof setTimeout>
}

interface Job {
  view: JobView
  start: () => void
  drop: () => void
  fail: (reason: JobReason) => void
  arrived?: () => void
  heard?: (raw: unknown) => void
}

type Hit = { kind: 'added'; row: unknown } | { kind: 'removed' }

interface PositionsWatch {
  confirm: PutConfirm
  shape: RowShape
  body: Record<string, string>
  fields: string
  match: (rows: readonly unknown[]) => Hit | undefined
}

const NAPPED = Symbol('napped')

function failedAnswer(reason: JobReason, raw?: unknown): RunAnswer {
  return { value: '', raw, failed: true, reason }
}

function unconfirmedAnswer(reason: JobReason): RunAnswer {
  return { value: '', raw: undefined, confirmed: false, reason }
}

function fitsToQuery(rows: readonly unknown[], fields: string): boolean {
  const first = rows[0]
  if (first === undefined || fields.trim() === '*') return true
  if (!isObject(first)) return false
  const key = Object.keys(first)
  return fields.split(',').map((f) => f.trim()).filter((f) => f !== '')
    .some((f) => key.some((k) => k === f || k.endsWith(`_${f}`)))
}

function isRecordAnswer(raw: unknown): boolean {
  return rowsFromQueryAnswer(raw) === undefined && extractRecordAnswer(raw) !== undefined
}

export class HostQueue {
  private readonly waiting: Job[] = []

  private current: Job | null = null

  private wire: Wire | null = null

  private paused = false

  private pauseClock: ReturnType<typeof setInterval> | null = null

  private pumping = false

  private nextId = 1

  private listening: (() => void) | null = null

  private readonly watchers = new Set<(job: JobView) => void>()

  private readonly connectionWatchers = new Set<(lost: boolean) => void>()

  watch(listener: (job: JobView) => void): () => void {
    this.watchers.add(listener)
    return () => { this.watchers.delete(listener) }
  }

  watchConnection(listener: (lost: boolean) => void): () => void {
    this.connectionWatchers.add(listener)
    return () => { this.connectionWatchers.delete(listener) }
  }

  relation(template: RuntimeRelation, params: readonly string[], options: RunOptions = {}): Promise<RunAnswer> {
    const art: JobArt = template.verb === 'GET_RELATION' ? 'get' : 'put'
    const job = this.newJob(art, `${template.verb}[${[template.nr, ...params].join('!')}]`, options)
    return new Promise((resolve) => {
      const end = (state: JobState, answer: RunAnswer): void => {
        this.end(job, state, answer)
        resolve(answer)
      }
      job.drop = () => { end('dropped', failedAnswer(STALE)) }
      job.fail = (reason) => { end('failed', failedAnswer(reason)) }
      job.start = art === 'get'
        ? () => { this.startGet(job, template, params, options.recordAnswer === true, end, options.selibGet === true) }
        : () => {
          this.runPut(job, template, params, options, end).catch((error: unknown) => {
            warn(`${job.view.question}: Ablauf gescheitert`, error)
            if (job.view.state === 'sent') end('unconfirmed', unconfirmedAnswer(NO_CONFIRMATION))
            else end('failed', failedAnswer(NOT_CONNECTED))
          })
        }
      this.enqueue(job)
    })
  }

  query(query: RuntimeQuery, name: string, keys: QueryKeys = ALL_RECORDS, options: RunOptions = {}): Promise<QueryAnswer> {
    const job = this.newJob('query', `ERPAPICALL[${query.id}!${query.fields}]`, options)
    return new Promise((resolve) => {
      const end = (state: JobState, answer: QueryAnswer): void => {
        this.end(job, state, answer.reason === undefined ? {} : { reason: answer.reason })
        resolve(answer)
      }
      job.drop = () => { end('dropped', { reason: STALE }) }
      job.fail = (reason) => { end('failed', { reason }) }
      job.start = () => { this.startQuery(job, query, name, keys, end) }
      this.enqueue(job)
    })
  }

  cancel(which: number | string): void {
    if (which === 0 || which === '') return
    const hits = (job: Job): boolean =>
      (typeof which === 'number' ? job.view.generation === which : job.view.origin === which)
    const stale = this.waiting.filter(hits)
    for (const job of stale) this.waiting.splice(this.waiting.indexOf(job), 1)
    stale.forEach((job) => { job.drop() })
    const current = this.current
    if (current !== null && current.view.art !== 'put' && hits(current)) current.drop()
  }

  private newJob(art: JobArt, question: string, options: RunOptions): Job {
    const view: JobView = {
      id: this.nextId++,
      art,
      origin: options.origin ?? '',
      generation: options.generation ?? 0,
      question,
      state: 'queued',
      queuedAt: Date.now(),
    }
    return { view, start: () => {}, drop: () => {}, fail: () => {} }
  }

  private report(job: Job): void {
    const view = { ...job.view }
    this.watchers.forEach((watcher) => {
      try {
        watcher(view)
      } catch (error) {
        warn('Beobachter der Reihe gescheitert', error)
      }
    })
  }

  private enqueue(job: Job): void {
    startSe()
    this.listen()
    const firstQuestion = job.view.art === 'put' ? this.waiting.findIndex((w) => w.view.art !== 'put') : -1
    if (firstQuestion === -1) this.waiting.push(job)
    else this.waiting.splice(firstQuestion, 0, job)
    this.report(job)
    if (this.paused) this.keepPauseClock()
    this.pump()
  }

  // A question SoftEngine left unanswered pauses the line: a late answer must
  // not land on the next question. Who waits meanwhile gives up after the
  // usual wait instead of hanging; the next message from SoftEngine resumes.
  private pause(): void {
    if (this.paused) return
    this.paused = true
    this.tellConnection(true)
    this.expireWaiting()
    this.keepPauseClock()
  }

  private resume(): void {
    if (!this.paused) return
    this.paused = false
    this.stopPauseClock()
    this.tellConnection(false)
    this.pump()
  }

  private keepPauseClock(): void {
    if (this.pauseClock !== null || this.waiting.length === 0) return
    this.pauseClock = setInterval(() => { this.expireWaiting() }, PAUSE_CHECK_MS)
  }

  private stopPauseClock(): void {
    if (this.pauseClock === null) return
    clearInterval(this.pauseClock)
    this.pauseClock = null
  }

  private expireWaiting(): void {
    const now = Date.now()
    const late = this.waiting.filter((job) => now - job.view.queuedAt >= ANSWER_WAIT_MS)
    for (const job of late) this.waiting.splice(this.waiting.indexOf(job), 1)
    late.forEach((job) => { job.fail(NO_ANSWER) })
    if (this.waiting.length === 0) this.stopPauseClock()
  }

  private tellConnection(lost: boolean): void {
    this.connectionWatchers.forEach((watcher) => {
      try {
        watcher(lost)
      } catch (error) {
        warn('Beobachter der Verbindung gescheitert', error)
      }
    })
  }

  private sent(job: Job): void {
    job.view.state = 'sent'
    job.view.sentAt = Date.now()
    this.report(job)
  }

  private end(job: Job, state: JobState, answer: Pick<RunAnswer, 'reason' | 'record' | 'gone'>): void {
    if (job.view.endedAt !== undefined) return
    job.view.state = state
    job.view.endedAt = Date.now()
    if (answer.reason !== undefined) job.view.reason = answer.reason
    if (answer.record !== undefined) job.view.record = answer.record
    if (answer.gone === true) job.view.gone = true
    if (state === 'failed' && answer.reason !== undefined) warn(`${job.view.question}: ${answer.reason}`)
    this.report(job)
    if (this.current === job) this.current = null
    this.pump()
  }

  private pump(): void {
    if (this.pumping) return
    this.pumping = true
    try {
      while (this.current === null && this.wire === null && !this.paused) {
        const job = this.waiting.shift()
        if (job === undefined) break
        this.current = job
        job.start()
      }
    } finally {
      this.pumping = false
    }
    this.rest()
  }

  private listen(): void {
    if (this.listening !== null) return
    const offAnswer = onSeAnswer(this.answered)
    const offArrival = onSeArrival(this.arrived)
    this.listening = () => { offAnswer(); offArrival() }
  }

  private rest(): void {
    if (this.current !== null || this.wire !== null || this.paused || this.waiting.length > 0) return
    this.listening?.()
    this.listening = null
  }

  private readonly answered = (raw: unknown): void => {
    if (this.paused) {
      // Nothing else is asked while paused, so this answers the question that
      // ran out of time; given to the next one, it would answer the wrong one.
      warn('Späte Antwort von SoftEngine, die Frage war schon abgelaufen', raw)
      this.resume()
      return
    }
    const wire = this.wire
    if (wire === null) {
      this.current?.heard?.(raw)
      return
    }
    if (!wire.fits(raw)) return
    this.wire = null
    clearTimeout(wire.clock)
    wire.settle({ kind: 'answer', raw })
    this.pump()
  }

  private readonly arrived = (): void => {
    this.current?.arrived?.()
    this.resume()
  }

  private ask(verb: string, body: Record<string, unknown>, fits: (raw: unknown) => boolean, onSent?: () => void): Promise<Wired> {
    return new Promise((settle) => {
      const g = seWindow()
      if (typeof g.basisHTML_SND_MSG !== 'function') {
        settle({ kind: 'unsent' })
        return
      }
      const wire: Wire = {
        fits: (raw) => fits(raw) || refusalOf(raw) !== undefined,
        settle,
        clock: setTimeout(() => {
          if (this.wire !== wire) return
          this.wire = null
          this.pause()
          settle({ kind: 'unanswered' })
        }, ANSWER_WAIT_MS),
      }
      this.wire = wire
      try {
        g.basisHTML_SND_MSG(verb, body)
      } catch (error) {
        warn(`${verb} nicht gesendet`, error)
        clearTimeout(wire.clock)
        this.wire = null
        settle({ kind: 'unsent' })
        return
      }
      onSent?.()
    })
  }

  private startGet(
    job: Job,
    template: RuntimeRelation,
    params: readonly string[],
    recordAnswer: boolean,
    end: (state: JobState, answer: RunAnswer) => void,
    selibGet = false,
  ): void {
    const fits = recordAnswer ? isRecordAnswer : answersRelation
    // As selib asks (SEJSONProcessing.js): only where a caller wants it.
    const body = selibGet
      ? { NR: template.nr, PARAMS: [...params], ALIAS: 'SEGet', ALS_ARRAY: 'false' }
      : { NR: template.nr, PARAMS: [...params] }
    void this.ask('GET_RELATION', body, fits, () => { this.sent(job) })
      .then((wired) => {
        if (job.view.state === 'dropped') return
        if (wired.kind === 'unsent') return end('failed', failedAnswer(NOT_CONNECTED))
        if (wired.kind === 'unanswered') return end('failed', failedAnswer(NO_ANSWER))
        const refusal = refusalOf(wired.raw)
        if (refusal !== undefined) return end('failed', failedAnswer(refused(refusal), wired.raw))
        const value = recordAnswer ? extractRecordAnswer(wired.raw) ?? '' : resultFromAnswer(wired.raw)
        end('done', { value, raw: wired.raw })
      })
      .catch((error: unknown) => {
        warn(`${job.view.question}: Antwort nicht lesbar`, error)
        end('failed', failedAnswer(NO_ANSWER))
      })
  }

  private startQuery(
    job: Job,
    query: RuntimeQuery,
    name: string,
    keys: QueryKeys,
    end: (state: JobState, answer: QueryAnswer) => void,
  ): void {
    const fits = (raw: unknown): boolean => {
      const rows = rowsFromQueryAnswer(raw)
      return rows !== undefined && fitsToQuery(rows, query.fields)
    }
    const { documentKind, address } = keys
    const body = {
      ID: query.id,
      ALIAS: name,
      FELDER: query.fields,
      ...(documentKind === '' ? {} : { BELART: documentKind }),
      ...(address === '' ? {} : { VON_ADRNR: address, BIS_ADRNR: address }),
    }
    void this.ask('ERPAPICALL', body, fits, () => { this.sent(job) }).then((wired) => {
      if (job.view.state === 'dropped') return
      if (wired.kind === 'unsent') return end('failed', { reason: NOT_CONNECTED })
      if (wired.kind === 'unanswered') return end('failed', { reason: NO_ANSWER })
      const refusal = refusalOf(wired.raw)
      if (refusal !== undefined) return end('failed', { reason: refused(refusal) })
      end('done', { rows: rowsFromQueryAnswer(wired.raw) ?? [] })
    }).catch((error: unknown) => {
      warn(`${job.view.question}: Antwort nicht lesbar`, error)
      end('failed', { reason: NO_ANSWER })
    })
  }

  private positionsWatch(confirm: PutConfirm): PositionsWatch {
    const shape = rowShape(confirm.sourceId)
    const known = knownPositions(shownRows(confirm.sourceId), fieldRead)
    const fields = positionsAsked(shape.codes)
    const body = {
      ID: POSITIONS_QUERY.id,
      ALIAS: POSITIONS_QUERY.alias,
      BELNDX: documentIndex(confirm.document),
      OHNE_LEERFELDER: POSITIONS_QUERY.withoutEmpty,
      FELDER: fields,
    }
    const match = confirm.kind === 'removed'
      ? (rows: readonly unknown[]): Hit | undefined =>
        (positionGone(rows, confirm, known, fieldRead) ? { kind: 'removed' } : undefined)
      : (rows: readonly unknown[]): Hit | undefined => {
        const row = writtenPosition(rows, confirm, known, fieldRead)
        return row === undefined ? undefined : { kind: 'added', row }
      }
    return { confirm, shape, body, fields, match }
  }

  private confirmed(watch: PositionsWatch, hit: Hit, delivered: boolean): RunAnswer {
    const { confirm, shape } = watch
    if (hit.kind === 'removed') {
      if (!delivered) dropPosition(confirm.sourceId, confirm.row)
      reportTrigger()
      return { value: '', raw: undefined, confirmed: true, gone: true }
    }
    const row = delivered ? plainRow(hit.row) : shapedRow(hit.row, shape)
    if (!delivered) addPosition(confirm.sourceId, row)
    reportTrigger()
    const record = fieldRead(row, POSITION_FIELDS.number)
    return { value: record, raw: row, confirmed: true, row, ...(record === '' ? {} : { record }) }
  }

  private async askPositions(watch: PositionsWatch): Promise<unknown[] | undefined> {
    const fits = (raw: unknown): boolean => {
      const rows = rowsFromQueryAnswer(raw)
      return rows !== undefined && fitsToQuery(rows, watch.fields)
    }
    const wired = await this.ask('ERPAPICALL', watch.body, fits)
    if (wired.kind !== 'answer' || refusalOf(wired.raw) !== undefined) return undefined
    return rowsFromQueryAnswer(wired.raw) ?? []
  }

  private async runPut(
    job: Job,
    template: RuntimeRelation,
    params: readonly string[],
    { confirm, sendOnly = false }: RunOptions,
    end: (state: JobState, answer: RunAnswer) => void,
  ): Promise<void> {
    const watch = confirm === undefined || sendOnly ? undefined : this.positionsWatch(confirm)
    const g = seWindow()
    if (typeof g.basisHTML_SND_MSG !== 'function') {
      end('failed', failedAnswer(NOT_CONNECTED))
      return
    }
    // What SoftEngine says while this write is the open question: a refusal
    // fails it; a plain RESULT is its answer. Data alone proves nothing.
    const signal: { arrived: boolean; refusal?: string; answer?: unknown; wake: () => void } = {
      arrived: false,
      wake: () => {},
    }
    job.arrived = () => {
      signal.arrived = true
      signal.wake()
    }
    job.heard = (raw) => {
      const refusal = refusalOf(raw)
      if (refusal !== undefined) signal.refusal ??= refusal
      else if (!watch && answersRelation(raw)) signal.answer ??= raw
      else return
      signal.wake()
    }

    writeGoesOut()
    try {
      g.basisHTML_SND_MSG(template.verb, { NR: template.nr, PARAMS: [...params] })
    } catch (error) {
      warn(`${template.verb} ${template.nr} nicht gesendet`, error)
      end('failed', failedAnswer(NOT_CONNECTED))
      return
    }
    this.sent(job)
    if (sendOnly) {
      end('unconfirmed', unconfirmedAnswer(NOT_ACKNOWLEDGED))
      return
    }

    const deadline = Date.now() + WRITE_WAIT_MS
    const told = (): boolean => signal.arrived || signal.refusal !== undefined || signal.answer !== undefined
    const nap = (ms: number): Promise<typeof NAPPED> => new Promise((done) => {
      if (told()) {
        done(NAPPED)
        return
      }
      const clock = setTimeout(() => { done(NAPPED) }, Math.max(0, ms))
      signal.wake = () => {
        clearTimeout(clock)
        done(NAPPED)
      }
    })

    let asks = watch !== undefined
    let asking: Promise<unknown[] | undefined> | null = null
    let nextAsk = Date.now() + FIRST_READ_MS
    while (job.view.endedAt === undefined && Date.now() < deadline) {
      if (signal.refusal !== undefined) {
        end('failed', failedAnswer(refused(signal.refusal)))
        return
      }
      if (signal.answer !== undefined) {
        end('done', { value: resultFromAnswer(signal.answer), raw: signal.answer, confirmed: true })
        return
      }
      if (signal.arrived) {
        signal.arrived = false
        if (!watch) {
          end('unconfirmed', unconfirmedAnswer(NOT_ACKNOWLEDGED))
          return
        }
        const hit = watch.match(deliveredRows(watch.confirm.sourceId))
        if (hit) {
          end('done', this.confirmed(watch, hit, true))
          return
        }
        continue
      }
      if (watch && asks && asking === null && Date.now() >= nextAsk) asking = this.askPositions(watch)
      const wakeAt = asking === null && asks ? Math.min(nextAsk, deadline) : deadline
      const outcome = await Promise.race([...(asking === null ? [] : [asking]), nap(wakeAt - Date.now())])
      if (outcome === NAPPED) continue
      asking = null
      nextAsk = Date.now() + READ_AGAIN_MS
      if (outcome === undefined) {
        asks = false
        continue
      }
      const hit = watch?.match(outcome)
      if (watch && hit) {
        end('done', this.confirmed(watch, hit, false))
        return
      }
    }
    end('unconfirmed', unconfirmedAnswer(watch ? NO_CONFIRMATION : NOT_ACKNOWLEDGED))
  }
}

const line = new HostQueue()

const generations = { last: 0 }

export function newGeneration(): number {
  generations.last += 1
  return generations.last
}

export function relationRun(
  template: RuntimeRelation,
  params: readonly string[],
  options: RunOptions = {},
): Promise<RunAnswer> {
  return line.relation(template, params, options)
}

export function queryRun(
  query: RuntimeQuery,
  name: string,
  keys: QueryKeys = ALL_RECORDS,
  options: RunOptions = {},
): Promise<QueryAnswer> {
  return line.query(query, name, keys, options)
}

export function cancelJobs(which: number | string): void {
  line.cancel(which)
}

export function watchQueue(listener: (job: JobView) => void): () => void {
  return line.watch(listener)
}

export function watchConnection(listener: (lost: boolean) => void): () => void {
  return line.watchConnection(listener)
}
