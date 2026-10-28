import type { RuntimeQuery } from '../../core/data/deliveries/message'
import {
  ANSWER_WAIT_MS,
  NO_ANSWER,
  NO_CONFIRMATION,
  NOT_CONNECTED,
  STALE,
  type JobArt,
  type JobState,
  type JobView,
  type RunAnswer,
  type RunOptions,
} from '../../core/data/jobs'
import type { RuntimeRelation } from '../../core/data/relations'
import { onSeAnswer, onSeArrival, seWindow, startSe } from '../bridge'
import { warn } from '../../core/log'
import { refusalOf } from './answer'
import { startGet, startQuery } from './getJob'
import {
  ALL_RECORDS,
  failedAnswer,
  queuedJob,
  unconfirmedAnswer,
  type Job,
  type JobLine,
  type QueryAnswer,
  type QueryKeys,
  type Wire,
  type Wired,
} from './job'
import { runPut } from './putJob'
import { Watchers } from './watchers'

// The one line to SoftEngine: jobs run one after the other, a write goes
// ahead of waiting questions, an unanswered question pauses the line until
// SoftEngine speaks again.

const PAUSE_CHECK_MS = 1_000

class HostQueue implements JobLine {
  private readonly waiting: Job[] = []

  private current: Job | null = null

  private wire: Wire | null = null

  private paused = false

  private pauseClock: ReturnType<typeof setInterval> | null = null

  private pumping = false

  private nextId = 1

  private listening: (() => void) | null = null

  private readonly jobWatchers = new Watchers<JobView>('Beobachter der Reihe gescheitert')

  private readonly connectionWatchers = new Watchers<boolean>('Beobachter der Verbindung gescheitert')

  watch(listener: (job: JobView) => void): () => void {
    return this.jobWatchers.add(listener)
  }

  watchConnection(listener: (lost: boolean) => void): () => void {
    return this.connectionWatchers.add(listener)
  }

  relation(template: RuntimeRelation, params: readonly string[], options: RunOptions = {}): Promise<RunAnswer> {
    const art: JobArt = template.verb === 'GET_RELATION' ? 'get' : 'put'
    const job = this.newJob(art, `${template.verb}[${[template.nr, ...params].join('!')}]`, options)
    return new Promise((resolve) => {
      const end = (state: JobState, answer: RunAnswer): void => {
        this.end(job, state, answer)
        resolve(answer)
      }
      job.drop = () => {
        end('dropped', failedAnswer(STALE))
      }
      job.fail = (reason) => {
        end('failed', failedAnswer(reason))
      }
      job.start =
        art === 'get'
          ? () => {
              startGet(this, job, template, params, options.recordAnswer === true, end, options.selibGet === true)
            }
          : () => {
              runPut(this, job, template, params, options, end).catch((error: unknown) => {
                warn(`${job.view.question}: Ablauf gescheitert`, error)
                if (job.view.state === 'sent') end('unconfirmed', unconfirmedAnswer(NO_CONFIRMATION))
                else end('failed', failedAnswer(NOT_CONNECTED))
              })
            }
      this.enqueue(job)
    })
  }

  query(
    query: RuntimeQuery,
    name: string,
    keys: QueryKeys = ALL_RECORDS,
    options: RunOptions = {},
  ): Promise<QueryAnswer> {
    const job = this.newJob('query', `ERPAPICALL[${query.id}!${query.fields}]`, options)
    return new Promise((resolve) => {
      const end = (state: JobState, answer: QueryAnswer): void => {
        this.end(job, state, answer.reason === undefined ? {} : { reason: answer.reason })
        resolve(answer)
      }
      job.drop = () => {
        end('dropped', { reason: STALE })
      }
      job.fail = (reason) => {
        end('failed', { reason })
      }
      job.start = () => {
        startQuery(this, job, query, name, keys, end)
      }
      this.enqueue(job)
    })
  }

  cancel(which: number | string): void {
    if (which === 0 || which === '') return
    const hits = (job: Job): boolean =>
      typeof which === 'number' ? job.view.generation === which : job.view.origin === which
    const stale = this.waiting.filter(hits)
    for (const job of stale) this.waiting.splice(this.waiting.indexOf(job), 1)
    stale.forEach((job) => {
      job.drop()
    })
    const current = this.current
    if (current !== null && current.view.art !== 'put' && hits(current)) current.drop()
  }

  private newJob(art: JobArt, question: string, options: RunOptions): Job {
    return queuedJob(this.nextId++, art, question, options)
  }

  private report(job: Job): void {
    this.jobWatchers.tell({ ...job.view })
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
    this.connectionWatchers.tell(true)
    this.expireWaiting()
    this.keepPauseClock()
  }

  private resume(): void {
    if (!this.paused) return
    this.paused = false
    this.stopPauseClock()
    this.connectionWatchers.tell(false)
    this.pump()
  }

  private keepPauseClock(): void {
    if (this.pauseClock !== null || this.waiting.length === 0) return
    this.pauseClock = setInterval(() => {
      this.expireWaiting()
    }, PAUSE_CHECK_MS)
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
    late.forEach((job) => {
      job.fail(NO_ANSWER)
    })
    if (this.waiting.length === 0) this.stopPauseClock()
  }

  sent(job: Job): void {
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
    this.listening = () => {
      offAnswer()
      offArrival()
    }
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

  ask(
    verb: string,
    body: Record<string, unknown>,
    fits: (raw: unknown) => boolean,
    onSent?: () => void,
  ): Promise<Wired> {
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
}

const line = new HostQueue()

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
