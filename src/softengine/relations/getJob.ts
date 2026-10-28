import type { RuntimeQuery } from '../../core/data/deliveries/message'
import { NO_ANSWER, NOT_CONNECTED, refused, type JobState, type RunAnswer } from '../../core/data/jobs'
import type { RuntimeRelation } from '../../core/data/relations'
import { rowsFromQueryAnswer } from '../data'
import { warn } from '../../core/log'
import { answersRelation, extractRecordAnswer, refusalOf, resultFromAnswer } from './answer'
import {
  failedAnswer,
  fitsToQuery,
  isRecordAnswer,
  type Job,
  type JobLine,
  type QueryAnswer,
  type QueryKeys,
} from './job'

// Questions to SoftEngine: a GET_RELATION and an ERPAPICALL query. Each
// sends once and ends the job with what came back.

export function startGet(
  line: JobLine,
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
  void line
    .ask('GET_RELATION', body, fits, () => {
      line.sent(job)
    })
    .then((wired) => {
      if (job.view.state === 'dropped') return
      if (wired.kind === 'unsent') return end('failed', failedAnswer(NOT_CONNECTED))
      if (wired.kind === 'unanswered') return end('failed', failedAnswer(NO_ANSWER))
      const refusal = refusalOf(wired.raw)
      if (refusal !== undefined) return end('failed', failedAnswer(refused(refusal), wired.raw))
      const value = recordAnswer ? (extractRecordAnswer(wired.raw) ?? '') : resultFromAnswer(wired.raw)
      end('done', { value, raw: wired.raw })
    })
    .catch((error: unknown) => {
      warn(`${job.view.question}: Antwort nicht lesbar`, error)
      end('failed', failedAnswer(NO_ANSWER))
    })
}

export function startQuery(
  line: JobLine,
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
  void line
    .ask('ERPAPICALL', body, fits, () => {
      line.sent(job)
    })
    .then((wired) => {
      if (job.view.state === 'dropped') return
      if (wired.kind === 'unsent') return end('failed', { reason: NOT_CONNECTED })
      if (wired.kind === 'unanswered') return end('failed', { reason: NO_ANSWER })
      const refusal = refusalOf(wired.raw)
      if (refusal !== undefined) return end('failed', { reason: refused(refusal) })
      end('done', { rows: rowsFromQueryAnswer(wired.raw) ?? [] })
    })
    .catch((error: unknown) => {
      warn(`${job.view.question}: Antwort nicht lesbar`, error)
      end('failed', { reason: NO_ANSWER })
    })
}
