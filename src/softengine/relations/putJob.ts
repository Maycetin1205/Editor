import {
  NO_CONFIRMATION,
  NOT_ACKNOWLEDGED,
  NOT_CONNECTED,
  refused,
  type JobState,
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
import { reportTrigger, seWindow, writeGoesOut } from '../bridge'
import { rowsFromQueryAnswer } from '../data'
import { fieldRead } from '../fields'
import { addPosition, deliveredRows, dropPosition, plainRow, rowShape, shapedRow, shownRows } from '../positionsOverlay'
import { warn } from '../warning'
import { answersRelation, refusalOf, resultFromAnswer } from './answer'
import {
  failedAnswer,
  fitsToQuery,
  unconfirmedAnswer,
  type Hit,
  type Job,
  type JobLine,
  type PositionsWatch,
} from './job'

// A write to SoftEngine (PUT_RELATION, PUTADD_RELATION): sent once, then the
// line waits for a refusal, a RESULT, or for the written position to show up
// in the positions SoftEngine delivers or answers.

const WRITE_WAIT_MS = 10_000

const FIRST_READ_MS = 150
const READ_AGAIN_MS = 500

const NAPPED = Symbol('napped')

function positionsWatch(confirm: PutConfirm): PositionsWatch {
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
  const match =
    confirm.kind === 'removed'
      ? (rows: readonly unknown[]): Hit | undefined =>
          positionGone(rows, confirm, known, fieldRead) ? { kind: 'removed' } : undefined
      : (rows: readonly unknown[]): Hit | undefined => {
          const row = writtenPosition(rows, confirm, known, fieldRead)
          return row === undefined ? undefined : { kind: 'added', row }
        }
  return { confirm, shape, body, fields, match }
}

function confirmed(watch: PositionsWatch, hit: Hit, delivered: boolean): RunAnswer {
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

async function askPositions(line: JobLine, watch: PositionsWatch): Promise<unknown[] | undefined> {
  const fits = (raw: unknown): boolean => {
    const rows = rowsFromQueryAnswer(raw)
    return rows !== undefined && fitsToQuery(rows, watch.fields)
  }
  const wired = await line.ask('ERPAPICALL', watch.body, fits)
  if (wired.kind !== 'answer' || refusalOf(wired.raw) !== undefined) return undefined
  return rowsFromQueryAnswer(wired.raw) ?? []
}

// What SoftEngine says while a write is the open question.
interface WriteSignal {
  arrived: boolean
  refusal?: string
  answer?: unknown
  wake: () => void
}

type Ended = [JobState, RunAnswer]

function napUntilTold(signal: WriteSignal, ms: number): Promise<typeof NAPPED> {
  return new Promise((done) => {
    if (signal.arrived || signal.refusal !== undefined || signal.answer !== undefined) {
      done(NAPPED)
      return
    }
    const clock = setTimeout(
      () => {
        done(NAPPED)
      },
      Math.max(0, ms),
    )
    signal.wake = () => {
      clearTimeout(clock)
      done(NAPPED)
    }
  })
}

// After the write went out: a refusal fails it, a RESULT answers it, a
// delivery or an asked position list confirms it, the deadline leaves it
// unconfirmed.
async function awaitConfirmation(
  line: JobLine,
  job: Job,
  watch: PositionsWatch | undefined,
  signal: WriteSignal,
): Promise<Ended> {
  const deadline = Date.now() + WRITE_WAIT_MS
  let asks = watch !== undefined
  let asking: Promise<unknown[] | undefined> | null = null
  let nextAsk = Date.now() + FIRST_READ_MS
  while (job.view.endedAt === undefined && Date.now() < deadline) {
    if (signal.refusal !== undefined) return ['failed', failedAnswer(refused(signal.refusal))]
    if (signal.answer !== undefined) {
      return ['done', { value: resultFromAnswer(signal.answer), raw: signal.answer, confirmed: true }]
    }
    if (signal.arrived) {
      signal.arrived = false
      if (!watch) return ['unconfirmed', unconfirmedAnswer(NOT_ACKNOWLEDGED)]
      const hit = watch.match(deliveredRows(watch.confirm.sourceId))
      if (hit) return ['done', confirmed(watch, hit, true)]
      continue
    }
    if (watch && asks && asking === null && Date.now() >= nextAsk) asking = askPositions(line, watch)
    const wakeAt = asking === null && asks ? Math.min(nextAsk, deadline) : deadline
    const outcome = await Promise.race([
      ...(asking === null ? [] : [asking]),
      napUntilTold(signal, wakeAt - Date.now()),
    ])
    if (outcome === NAPPED) continue
    asking = null
    nextAsk = Date.now() + READ_AGAIN_MS
    if (outcome === undefined) {
      asks = false
      continue
    }
    const hit = watch?.match(outcome)
    if (watch && hit) return ['done', confirmed(watch, hit, false)]
  }
  return ['unconfirmed', unconfirmedAnswer(watch ? NO_CONFIRMATION : NOT_ACKNOWLEDGED)]
}

export async function runPut(
  line: JobLine,
  job: Job,
  template: RuntimeRelation,
  params: readonly string[],
  { confirm, sendOnly = false }: RunOptions,
  end: (state: JobState, answer: RunAnswer) => void,
): Promise<void> {
  const watch = confirm === undefined || sendOnly ? undefined : positionsWatch(confirm)
  const g = seWindow()
  if (typeof g.basisHTML_SND_MSG !== 'function') {
    end('failed', failedAnswer(NOT_CONNECTED))
    return
  }
  // What SoftEngine says while this write is the open question: a refusal
  // fails it; a plain RESULT is its answer. Data alone proves nothing.
  const signal: WriteSignal = { arrived: false, wake: () => {} }
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
  line.sent(job)
  if (sendOnly) {
    end('unconfirmed', unconfirmedAnswer(NOT_ACKNOWLEDGED))
    return
  }

  const [state, answer] = await awaitConfirmation(line, job, watch, signal)
  end(state, answer)
}
