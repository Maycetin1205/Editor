import { html, type TemplateResult } from 'lit'
import { chosenDay, dayOf } from '../../runtime/chosenDay'
import type { CardData } from './board'

export interface Until {
  text: string
  late: boolean
}

function minuteOf(text: string): number | null {
  const time = /(?<!\d)(\d{1,2}):(\d{2})(?!\d)/.exec(text)
  if (!time) return null
  const hour = Number(time[1])
  const minute = Number(time[2])
  return hour < 24 && minute < 60 ? hour * 60 + minute : null
}

const minuteNow = (now: Date): number => now.getHours() * 60 + now.getMinutes()

const isToday = (now: Date): boolean => chosenDay() === dayOf(now)

const clockOf = (now: Date): string => now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

// How long a card has waited since a time of today, as "14 Min.".
export function waitOf(since: string, now: Date): string | null {
  const minute = minuteOf(since)
  if (minute === null) return null
  const span = Math.max(0, minuteNow(now) - minute)
  if (span < 60) return `${span} Min.`
  const rest = span % 60
  return `${Math.floor(span / 60)} Std.${rest > 0 ? ` ${rest} Min.` : ''}`
}

function untilOf(minute: number, now: number): Until | null {
  const away = minute - now
  if (away === 0) return { text: 'jetzt', late: false }
  const span = Math.abs(away)
  if (span >= 600) return null
  const rest = span % 60
  const text = span < 60 ? `${span} min` : `${Math.floor(span / 60)} h${rest > 0 ? ` ${rest} min` : ''}`
  return away > 0 ? { text: `in ${text}`, late: false } : { text: `vor ${text}`, late: true }
}

const hourLine = (hour: number): TemplateResult => html`<div class="hour">${String(hour).padStart(2, '0')} Uhr</div>`

const nowLine = (now: Date): TemplateResult => html`<div class="now">Jetzt · ${clockOf(now)}</div>`

export const SAMPLE_HOUR_LINE: TemplateResult = hourLine(9)
export const SAMPLE_UNTIL: Until = { text: 'in 20 min', late: false }

export function cardsByClock(
  cards: readonly CardData[],
  cardTpl: (card: CardData, until: Until | null) => TemplateResult,
): TemplateResult[] {
  const now = new Date()
  const nowMinute = minuteNow(now)
  const today = isToday(now)
  const timed = cards
    .map((card) => ({ card, minute: minuteOf(card.values.time ?? '') }))
    .sort((a, b) => (a.minute ?? Infinity) - (b.minute ?? Infinity) || 0)
  const out: TemplateResult[] = []
  let hour = -1
  let nowShown = !today
  for (const { card, minute } of timed) {
    // Cards without a time sort last: when every time has passed, they still
    // come after the now line, not before it.
    if (!nowShown && (minute === null || minute > nowMinute)) {
      out.push(nowLine(now))
      nowShown = true
    }
    if (minute !== null && Math.floor(minute / 60) !== hour) {
      hour = Math.floor(minute / 60)
      out.push(hourLine(hour))
    }
    out.push(cardTpl(card, today && minute !== null ? untilOf(minute, nowMinute) : null))
  }
  if (!nowShown && timed.length > 0) out.push(nowLine(now))
  return out
}
