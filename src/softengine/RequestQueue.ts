import type { RelationVerb } from '@/model/relations'
import type { SoftEngineBridge } from './SoftEngineBridge'
import { answersRelation, fitsToQuery, refusalOf, resultFromAnswer, rowsFromQueryAnswer } from './payload'

// The one line to SoftEngine. SoftEngine answers without saying which
// question it answers, so only one question is open at a time: jobs run one
// after the other, a write goes ahead of waiting questions, and a question
// SoftEngine leaves unanswered pauses the line until it speaks again, so a
// late answer cannot land on the next question.

export interface CallAnswer {
  ok: boolean
  value: string
  raw?: unknown
  error?: string
}

export const NOT_CONNECTED = 'keine Verbindung zu SoftEngine'
export const NO_ANSWER = 'SoftEngine antwortet nicht'
const refused = (text: string): string => `von SoftEngine abgelehnt: ${text}`
const UNANSWERED: CallAnswer = { ok: false, value: '', error: NO_ANSWER }

const ANSWER_WAIT_MS = 20_000
// How long a write waits for SoftEngine to object. SoftEngine takes most
// writes without a word; once it is seen to answer them, the line waits longer.
const WRITE_SETTLE_MS = 200
const WRITE_ANSWERED_MS = 3_000
const MESSAGE_LOOK_MS = 100
const PAUSE_CHECK_MS = 1_000

type Wired = { kind: 'answer'; raw: unknown } | { kind: 'unanswered' } | { kind: 'unsent' }

interface Wire {
  fits: (raw: unknown) => boolean
  settle: (wired: Wired) => void
}

interface Job {
  write: boolean
  queuedAt: number
  run: () => Promise<void>
  expire: () => void
}

export class RequestQueue {
  private readonly bridge: SoftEngineBridge
  private readonly waiting: Job[] = []
  private running = false
  private wire: Wire | null = null
  private paused = false
  private pauseClock: ReturnType<typeof setInterval> | null = null
  private writesAnswered = false
  private listening = false
  private readonly lostListeners = new Set<(lost: boolean) => void>()
  private readonly refusalListeners = new Set<(text: string) => void>()

  constructor(bridge: SoftEngineBridge) {
    this.bridge = bridge
  }

  // Told when SoftEngine stops answering, and when it is back.
  onLost(listener: (lost: boolean) => void): void {
    this.lostListeners.add(listener)
  }

  // Told when SoftEngine refuses something nobody waits for any more, e.g. a
  // write it objects to late.
  onRefusal(listener: (text: string) => void): void {
    this.refusalListeners.add(listener)
  }

  // A GET_RELATION: resolves with the value SoftEngine answers.
  get(nr: string, params: readonly string[]): Promise<CallAnswer> {
    return this.enqueue(false, UNANSWERED, async () => {
      const wired = await this.ask('GET_RELATION', { NR: nr, PARAMS: [...params] }, answersRelation, ANSWER_WAIT_MS, true)
      if (wired.kind === 'unsent') return { ok: false, value: '', error: NOT_CONNECTED }
      if (wired.kind === 'unanswered') return { ok: false, value: '', error: NO_ANSWER }
      const refusal = refusalOf(wired.raw)
      if (refusal !== undefined) return { ok: false, value: '', raw: wired.raw, error: refused(refusal) }
      return { ok: true, value: resultFromAnswer(wired.raw), raw: wired.raw }
    })
  }

  // A PUT_RELATION or PUTADD_RELATION: sent once; fails when SoftEngine
  // objects, and counts as done when it stays silent.
  put(verb: Exclude<RelationVerb, 'GET_RELATION'>, nr: string, params: readonly string[]): Promise<CallAnswer> {
    return this.enqueue(true, UNANSWERED, async () => {
      const wait = this.writesAnswered ? WRITE_ANSWERED_MS : WRITE_SETTLE_MS
      const wired = await this.ask(verb, { NR: nr, PARAMS: [...params] }, answersRelation, wait, false)
      if (wired.kind === 'unsent') return { ok: false, value: '', error: NOT_CONNECTED }
      if (wired.kind === 'unanswered') return { ok: true, value: '' }
      const refusal = refusalOf(wired.raw)
      if (refusal !== undefined) return { ok: false, value: '', raw: wired.raw, error: refused(refusal) }
      this.writesAnswered = true
      return { ok: true, value: resultFromAnswer(wired.raw), raw: wired.raw }
    })
  }

  // An ERP query (ERPAPICALL): resolves with the rows, or null when SoftEngine gave none.
  query(body: Record<string, string>, fields: string): Promise<unknown[] | null> {
    const fits = (raw: unknown): boolean => {
      const rows = rowsFromQueryAnswer(raw)
      return rows !== undefined && fitsToQuery(rows, fields)
    }
    return this.enqueue<unknown[] | null>(false, null, async () => {
      const wired = await this.ask('ERPAPICALL', body, fits, ANSWER_WAIT_MS, true)
      if (wired.kind !== 'answer' || refusalOf(wired.raw) !== undefined) return null
      return rowsFromQueryAnswer(wired.raw) ?? []
    })
  }

  // `expired` is what a job answers when it never got its turn.
  private enqueue<T>(write: boolean, expired: T, work: () => Promise<T>): Promise<T> {
    this.listen()
    return new Promise<T>((resolve, reject) => {
      const job: Job = {
        write,
        queuedAt: Date.now(),
        run: () => work().then(resolve, reject),
        expire: () => resolve(expired),
      }
      // A write goes ahead of the questions that wait.
      const firstQuestion = write ? this.waiting.findIndex((other) => !other.write) : -1
      if (firstQuestion === -1) this.waiting.push(job)
      else this.waiting.splice(firstQuestion, 0, job)
      if (this.paused) this.keepPauseClock()
      void this.pump()
    })
  }

  private async pump(): Promise<void> {
    if (this.running || this.paused) return
    const job = this.waiting.shift()
    if (!job) return
    this.running = true
    try {
      await job.run()
    } finally {
      this.running = false
      void this.pump()
    }
  }

  private listen(): void {
    if (this.listening) return
    this.listening = true
    this.bridge.onAnswer((raw) => this.answered(raw))
    this.bridge.onArrival(() => this.resume())
  }

  private answered(raw: unknown): void {
    if (this.paused) {
      // Nothing else is asked while paused: this answers the question that ran
      // out of time. Given to the next one, it would answer the wrong one.
      console.warn('[Maske] Späte Antwort von SoftEngine, die Frage war schon abgelaufen', raw)
      this.resume()
      return
    }
    const wire = this.wire
    if (wire && (wire.fits(raw) || refusalOf(raw) !== undefined)) {
      this.wire = null
      wire.settle({ kind: 'answer', raw })
      return
    }
    const refusal = refusalOf(raw)
    if (refusal !== undefined) this.refusalListeners.forEach((listener) => listener(refusal))
  }

  private ask(
    verb: string,
    body: Record<string, unknown>,
    fits: (raw: unknown) => boolean,
    waitMs: number,
    pauseWhenSilent: boolean,
  ): Promise<Wired> {
    return new Promise((resolve) => {
      const seen = new Set(this.bridge.messageKeys())
      let look: ReturnType<typeof setInterval> | null = null
      let clock: ReturnType<typeof setTimeout> | null = null
      const wire: Wire = {
        fits,
        settle: (wired) => {
          if (look !== null) clearInterval(look)
          if (clock !== null) clearTimeout(clock)
          resolve(wired)
        },
      }
      this.wire = wire
      if (!this.bridge.send(verb, body)) {
        this.wire = null
        wire.settle({ kind: 'unsent' })
        return
      }
      // Some versions of SoftEngine leave the answer under SEDATA.MessageN.
      look = setInterval(() => {
        if (this.wire !== wire) return
        const fresh = this.bridge.messageKeys().filter((key) => !seen.has(key))
        const raw = fresh.length > 0 ? this.bridge.message(fresh[fresh.length - 1]) : undefined
        if (raw === undefined || !(fits(raw) || refusalOf(raw) !== undefined)) return
        this.wire = null
        wire.settle({ kind: 'answer', raw })
      }, MESSAGE_LOOK_MS)
      clock = setTimeout(() => {
        if (this.wire !== wire) return
        this.wire = null
        if (pauseWhenSilent) this.pause()
        wire.settle({ kind: 'unanswered' })
      }, waitMs)
    })
  }

  private pause(): void {
    if (this.paused) return
    this.paused = true
    this.lostListeners.forEach((listener) => listener(true))
    this.expireWaiting()
    this.keepPauseClock()
  }

  private resume(): void {
    if (!this.paused) return
    this.paused = false
    if (this.pauseClock !== null) clearInterval(this.pauseClock)
    this.pauseClock = null
    this.lostListeners.forEach((listener) => listener(false))
    void this.pump()
  }

  // Who waits while the line is paused gives up after the usual wait instead of hanging.
  private keepPauseClock(): void {
    if (this.pauseClock !== null || this.waiting.length === 0) return
    this.pauseClock = setInterval(() => this.expireWaiting(), PAUSE_CHECK_MS)
  }

  private expireWaiting(): void {
    const now = Date.now()
    const late = this.waiting.filter((job) => now - job.queuedAt >= ANSWER_WAIT_MS)
    for (const job of late) this.waiting.splice(this.waiting.indexOf(job), 1)
    late.forEach((job) => job.expire())
    if (this.waiting.length === 0 && this.pauseClock !== null) {
      clearInterval(this.pauseClock)
      this.pauseClock = null
    }
  }
}
