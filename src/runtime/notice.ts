import {
  ANSWER_WAIT_MS,
  NOT_ACKNOWLEDGED,
  NOT_CONNECTED,
  NO_ANSWER,
  NO_CONFIRMATION,
  STALE,
  refusalText,
  type JobReason,
} from '../core/data/jobs'
import type { ActionResult } from './actions/actionResult'
import { closeFailure, showFailure } from './infoBar'

// What a block shows about its last action, as the data-ff-notice attribute.
export type NoticeState = 'quiet' | 'loading' | 'writing' | 'saved' | 'sent' | 'failed'

export const NOTICE_ATTR = 'data-ff-notice'
export const NOTICE_REASON_ATTR = 'data-ff-notice-reason'

const SHOWN: readonly NoticeState[] = ['loading', 'writing', 'saved', 'sent', 'failed']

export function noticeStateOf(raw: string | null): NoticeState {
  return SHOWN.find((state) => state === raw) ?? 'quiet'
}

const SAVED_SHOWN_MS = 2_000

const NOT_CONFIRMED = 'Gesendet, aber von SoftEngine nicht bestätigt'

const SENT_ONLY = 'Gesendet. SoftEngine meldet nicht zurück, ob es gespeichert hat.'

function reasonSentence(reason: JobReason | undefined): string {
  if (reason === undefined) return 'Aktion gescheitert'
  if (reason === NO_ANSWER) return `SoftEngine hat nicht geantwortet (${ANSWER_WAIT_MS / 1000} s)`
  if (reason === NO_CONFIRMATION) return NOT_CONFIRMED
  if (reason === NOT_ACKNOWLEDGED) return SENT_ONLY
  if (reason === NOT_CONNECTED) return 'Keine Verbindung zu SoftEngine'
  if (reason === STALE) return 'Verworfen, veraltet'
  return `SoftEngine hat abgelehnt: ${refusalText(reason) ?? reason}`
}

type Ended = 'saved' | 'sent'

interface Watch {
  acting: number
  loading: number
  failure: string | undefined
  saved: ReturnType<typeof setTimeout> | undefined
  savedAs: Ended
}

const watches = new WeakMap<HTMLElement, Watch>()

function watchOf(el: HTMLElement): Watch | undefined {
  if (el.hasAttribute('preview')) return undefined
  const known = watches.get(el)
  if (known) return known
  const watch: Watch = { acting: 0, loading: 0, failure: undefined, saved: undefined, savedAs: 'saved' }
  watches.set(el, watch)
  return watch
}

function shown(watch: Watch): { state: NoticeState; reason: string } {
  if (watch.acting > 0) return { state: 'writing', reason: '' }
  if (watch.saved !== undefined) return { state: watch.savedAs, reason: watch.savedAs === 'sent' ? SENT_ONLY : '' }
  if (watch.loading > 0) return { state: 'loading', reason: '' }
  if (watch.failure !== undefined) return { state: 'failed', reason: watch.failure }
  return { state: 'quiet', reason: '' }
}

function show(el: HTMLElement, watch: Watch): void {
  const { state, reason } = shown(watch)
  if (state === 'quiet') el.removeAttribute(NOTICE_ATTR)
  else el.setAttribute(NOTICE_ATTR, state)
  if (reason === '') el.removeAttribute(NOTICE_REASON_ATTR)
  else el.setAttribute(NOTICE_REASON_ATTR, reason)
}

function savedEnds(watch: Watch): void {
  clearTimeout(watch.saved)
  watch.saved = undefined
}

export function actionStarted(el: HTMLElement): void {
  const watch = watchOf(el)
  if (!watch) return
  watch.acting += 1
  watch.failure = undefined
  savedEnds(watch)
  show(el, watch)
}

// Only a write SoftEngine did not find again is worth the bar; one it took
// without a word is no failure, it shows as "gesendet" instead of the tick.
function failureOf(result: ActionResult): string | undefined {
  if (result.state === 'failed') return reasonSentence(result.reason)
  return result.state === 'unconfirmed' && result.reason === NO_CONFIRMATION ? NOT_CONFIRMED : undefined
}

export function actionEnded(el: HTMLElement, result: ActionResult): void {
  const watch = watchOf(el)
  if (!watch) return
  watch.acting = Math.max(0, watch.acting - 1)
  const failure = failureOf(result)
  if (failure !== undefined) {
    watch.failure = failure
    showFailure(el, failure)
  } else if (result.state === 'ran' || result.state === 'unconfirmed') {
    closeFailure()
    if (result.written) {
      savedEnds(watch)
      watch.savedAs = result.state === 'ran' ? 'saved' : 'sent'
      watch.saved = setTimeout(() => {
        watch.saved = undefined
        show(el, watch)
      }, SAVED_SHOWN_MS)
    }
  }
  show(el, watch)
}

export function loadStarted(el: HTMLElement): void {
  const watch = watchOf(el)
  if (!watch) return
  watch.loading += 1
  watch.failure = undefined
  show(el, watch)
}

// A source that did not come: the block that shows it says so at its place
// (an area in its body); the bar below stays for the connection of the mask.
export function loadFailed(el: HTMLElement, sentence: string): void {
  const watch = watchOf(el)
  if (!watch) return
  watch.failure = sentence
  show(el, watch)
}

export function loadEnded(el: HTMLElement): void {
  const watch = watchOf(el)
  if (!watch) return
  watch.loading = Math.max(0, watch.loading - 1)
  show(el, watch)
}
