import type { FieldType } from './sources'

// Dates, times and numbers as SoftEngine writes them, read into one form and
// shown the German way.

const pad2 = (n: number): string => String(n).padStart(2, '0')

// "JJJJ-MM-TT" from "TT.MM.JJJJ", "TT.MM.JJ", "JJJJMMTT" or "JJJJ-MM-TT"; '' when it is no date.
export function dayKey(text: string): string {
  const t = text.trim()
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})/.exec(t)
  if (m) {
    let year = Number(m[3])
    if (m[3].length === 2) year += year <= 69 ? 2000 : 1900
    return `${year}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`
  }
  m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(t)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function dateOfKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function addDays(key: string, days: number): string {
  const date = dateOfKey(key)
  date.setDate(date.getDate() + days)
  return dayKeyOf(date)
}

// "TT.MM.JJJJ", the form SoftEngine takes in a date field.
export function germanDate(key: string): string {
  const [year, month, day] = key.split('-')
  return key === '' ? '' : `${day}.${month}.${year}`
}

export function todayKey(): string {
  return dayKeyOf(new Date())
}

export function todayText(): string {
  return germanDate(todayKey())
}

// Monday of the week the day lies in.
export function weekStart(key: string): string {
  const date = dateOfKey(key)
  const weekday = (date.getDay() + 6) % 7
  return addDays(key, -weekday)
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

export function weekdayName(key: string, short = false): string {
  const name = WEEKDAYS[dateOfKey(key).getDay()]
  return short ? name.slice(0, 2) : name
}

// "Montag, 9. November 2026"
export function longDate(key: string): string {
  const date = dateOfKey(key)
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function monthName(key: string): string {
  const date = dateOfKey(key)
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

// Minute of the day from "10:30", "10.30", "1030" or "9:05"; null when it is no time.
export function minuteOf(text: string): number | null {
  const m = /(\d{1,2})[:.]?(\d{2})/.exec(text.trim())
  if (!m) return null
  const hours = Number(m[1])
  const minutes = Number(m[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

export function timeOfMinute(minute: number): string {
  const inDay = ((Math.round(minute) % 1440) + 1440) % 1440
  return `${pad2(Math.floor(inDay / 60))}:${pad2(inDay % 60)}`
}

export function nowMinute(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function nowTime(): string {
  return timeOfMinute(nowMinute())
}

// A number as SoftEngine or a person writes it: "1.234,50", "1234.5", "12".
export function parseNumber(text: string): number | null {
  let t = text.trim().replace(/\s|€/g, '')
  if (t === '') return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const MONEY = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const PLAIN = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 })

export function formatNumber(n: number): string {
  return PLAIN.format(n)
}

export function formatMoney(n: number): string {
  return `${MONEY.format(n)} €`
}

const TRUE_WORDS = new Set(['1', 'j', 'ja', 'y', 'yes', 'true', 'x', 'wahr'])

export function isTrue(text: string): boolean {
  return TRUE_WORDS.has(text.trim().toLowerCase())
}

// A field value as a mask shows it.
export function formatValue(value: string, type: FieldType): string {
  const text = value.trim()
  if (text === '') return ''
  switch (type) {
    case 'date': {
      const key = dayKey(text)
      return key === '' ? text : germanDate(key)
    }
    case 'time': {
      const minute = minuteOf(text)
      return minute === null ? text : timeOfMinute(minute)
    }
    case 'money': {
      const n = parseNumber(text)
      return n === null ? text : formatMoney(n)
    }
    case 'bool':
      return isTrue(text) ? 'Ja' : 'Nein'
    default:
      return text
  }
}

// What two values are compared by when lists are sorted.
export function sortKey(value: string, type: FieldType): string | number {
  switch (type) {
    case 'date':
      return dayKey(value)
    case 'time':
      return minuteOf(value) ?? -1
    case 'number':
    case 'money':
      return parseNumber(value) ?? Number.NEGATIVE_INFINITY
    default:
      return value.toLocaleLowerCase('de')
  }
}

// Numbers that mean the same record: "00012" and "12 ".
export function plainKey(value: string): string {
  const t = value.trim()
  const stripped = t.replace(/^0+(?=\d)/, '')
  return stripped.toLocaleLowerCase('de')
}

// Text as a search compares it: lower case, umlauts folded, no accents.
export function searchFold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function matchesSearch(haystack: string, needle: string): boolean {
  const words = searchFold(needle).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const text = searchFold(haystack)
  return words.every((word) => text.includes(word))
}
