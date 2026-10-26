import { asNumber, numberText } from '../../../core/data/number'
import type { Split, SplitColumn } from '../../../core/data/split'
import { readDate } from '../../../runtime/chosenDay'
import { maskHost } from '../../../runtime/host'
import { plainText } from '../../parts/cellSearch'

export interface SplitPick {
  record: unknown
  amount: string
}

type SplitTone = 'soon' | 'past' | undefined

type SplitKey = 'done' | 'back' | 'blocked' | 'handled' | 'nothing'

const SEARCH_PAUSE_MS = 900

const PAGE = 8

const AMOUNT_DECIMALS = 3

const read = (record: unknown, field: string): string =>
  field === '' ? '' : maskHost().readField(record, field).trim()

function startOfDay(moment: Date): number {
  return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate()).getTime()
}

function compared(a: string, b: string): number {
  if (a === '' || b === '') return a === b ? 0 : a === '' ? 1 : -1
  const da = readDate(a)
  const db = readDate(b)
  if (da !== null && db !== null) return da.getTime() - db.getTime()
  const na = asNumber(a)
  const nb = asNumber(b)
  if (na !== null && nb !== null) return na - nb
  return a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' })
}

export function splitRows(split: Split, records: readonly unknown[]): unknown[] {
  const shown = records.filter((record) => {
    if (split.hide.some((h) => read(record, h.field) === h.value.trim())) return false
    if (!split.hideEmpty || split.stockField === '') return true
    const stock = asNumber(read(record, split.stockField))
    return stock === null || stock > 0
  })
  if (split.sort.length === 0) return shown
  return shown
    .map((record, at) => ({ record, at }))
    .sort((x, y) => {
      for (const key of split.sort) {
        const order = compared(read(x.record, key.field), read(y.record, key.field))
        if (order !== 0) return key.down === true ? -order : order
      }
      return x.at - y.at
    })
    .map((o) => o.record)
}

export function splitTone(column: SplitColumn, value: string, today: Date = new Date()): SplitTone {
  if (column.soonDays === undefined) return undefined
  const date = readDate(value)
  if (date === null) return undefined
  const day = startOfDay(date)
  const now = startOfDay(today)
  if (day < now) return 'past'
  const soon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + column.soonDays).getTime()
  return day <= soon ? 'soon' : undefined
}

export function splitColumnText(record: unknown, column: SplitColumn): string {
  return read(record, column.field)
}

export class SplitState {
  private spec: Split | null = null

  private _rows: unknown[] = []

  private picks = new Map<unknown, string>()

  private _mark = 0

  private _editing = false

  private _total: number | null = null

  private search = { text: '', at: 0 }

  private _blocked = false

  private _loading = false

  get loading(): boolean {
    return this._loading
  }

  get blocked(): boolean {
    return this._blocked
  }

  get open(): boolean {
    return this.spec !== null
  }

  get split(): Split | null {
    return this.spec
  }

  get rows(): readonly unknown[] {
    return this._rows
  }

  get mark(): number {
    return this._mark
  }

  get editing(): boolean {
    return this._editing
  }

  get total(): number | null {
    return this._total
  }

  start(
    split: Split,
    rows: readonly unknown[],
    total: number | null,
    before: readonly SplitPick[],
    loading = false,
  ): void {
    this.spec = split
    this._loading = loading
    this._rows = [...rows]
    this._total = total
    this.picks = new Map()
    for (const pick of before) {
      const same =
        this._rows.find((row) => row === pick.record) ?? this._rows.find((row) => this.sameRecord(row, pick.record))
      if (same !== undefined) this.picks.set(same, pick.amount)
    }
    const first = this._rows.findIndex((row) => this.picks.has(row))
    this._mark = first === -1 ? 0 : first
    this._editing = false
    this._blocked = false
    this.search = { text: '', at: 0 }
  }

  stop(): void {
    this.spec = null
    this._loading = false
    this._rows = []
    this.picks = new Map()
    this._mark = 0
    this._editing = false
  }

  private sameRecord(a: unknown, b: unknown): boolean {
    const fields = this.spec?.columns.map((c) => c.field) ?? []
    return fields.length > 0 && fields.every((field) => read(a, field) === read(b, field))
  }

  amountOf(row: unknown): string | undefined {
    return this.picks.get(row)
  }

  stockOf(row: unknown): number | null {
    const field = this.spec?.stockField ?? ''
    return field === '' ? null : asNumber(read(row, field))
  }

  private sum(except?: unknown): number {
    let sum = 0
    for (const [row, amount] of this.picks) {
      if (row === except) continue
      sum += asNumber(amount) ?? 0
    }
    return sum
  }

  get rest(): number | null {
    return this._total === null ? null : this._total - this.sum()
  }

  over(row: unknown): boolean {
    const amount = this.picks.get(row)
    const n = amount === undefined ? null : asNumber(amount)
    const stock = this.stockOf(row)
    return n !== null && stock !== null && n > stock
  }

  wrong(row: unknown): boolean {
    const amount = this.picks.get(row)
    if (amount === undefined) return false
    const n = asNumber(amount)
    return n === null || n <= 0 || this.over(row)
  }

  get ready(): boolean {
    if (this.picks.size === 0) return false
    if ([...this.picks.keys()].some((row) => this.wrong(row))) return false
    const rest = this.rest
    return rest === null || Math.abs(rest) < 1e-9
  }

  picked(): SplitPick[] {
    return this._rows.flatMap((row) => {
      const amount = this.picks.get(row)
      return amount === undefined ? [] : [{ record: row, amount }]
    })
  }

  setMark(index: number): void {
    if (index < 0 || index >= this._rows.length) return
    if (index !== this._mark) this._editing = false
    this._mark = index
  }

  toggle(index: number): void {
    const row = this._rows[index]
    if (row === undefined) return
    this._mark = index
    this._editing = false
    if (this.picks.has(row)) {
      this.picks.delete(row)
      return
    }
    this.picks.set(row, this.suggested(row))
  }

  editAmount(index: number): void {
    const row = this._rows[index]
    if (row === undefined) return
    this._mark = index
    if (!this.picks.has(row)) this.picks.set(row, '')
    this._editing = true
  }

  private suggested(row: unknown): string {
    const stock = this.stockOf(row)
    const open = this._total === null ? null : this._total - this.sum(row)
    const wanted = open === null ? stock : stock === null ? open : Math.min(open, stock)
    return wanted === null || wanted <= 0 ? '' : numberText(wanted, AMOUNT_DECIMALS)
  }

  private typeChar(char: string): void {
    const row = this._rows[this._mark]
    if (row === undefined) return
    const before = this._editing ? (this.picks.get(row) ?? '') : ''
    if (char === ',' && before.includes(',')) return
    this.picks.set(row, before + char)
    this._editing = true
  }

  private backspace(): void {
    const row = this._rows[this._mark]
    if (row === undefined || !this.picks.has(row)) return
    const before = this.picks.get(row) ?? ''
    this.picks.set(row, before.slice(0, -1))
    this._editing = true
  }

  private seek(char: string, now: number): void {
    const text = now - this.search.at > SEARCH_PAUSE_MS ? char : this.search.text + char
    this.search = { text, at: now }
    const wanted = plainText(text)
    const columns = this.spec?.columns ?? []
    const hit = this._rows.findIndex((row) => columns.some((c) => plainText(read(row, c.field)).startsWith(wanted)))
    if (hit !== -1) this.setMark(hit)
  }

  key(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey'>, now: number = Date.now()): SplitKey {
    const outcome = this.keyOutcome(e, now)
    this._blocked = outcome === 'blocked'
    return outcome
  }

  private keyOutcome(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey'>, now: number): SplitKey {
    const last = this._rows.length - 1
    switch (e.key) {
      case 'ArrowDown':
        this.setMark(Math.min(last, this._mark + 1))
        return 'handled'
      case 'ArrowUp':
        this.setMark(Math.max(0, this._mark - 1))
        return 'handled'
      case 'PageDown':
        this.setMark(Math.min(last, this._mark + PAGE))
        return 'handled'
      case 'PageUp':
        this.setMark(Math.max(0, this._mark - PAGE))
        return 'handled'
      case 'Home':
        this.setMark(0)
        return 'handled'
      case 'End':
        this.setMark(last)
        return 'handled'
      case ' ':
        this.toggle(this._mark)
        return 'handled'
      case 'Delete': {
        const row = this._rows[this._mark]
        if (row !== undefined) this.picks.delete(row)
        this._editing = false
        return 'handled'
      }
      case 'Backspace':
        this.backspace()
        return 'handled'
      case 'Enter':
      case 'Tab':
        this._editing = false
        return this.ready ? 'done' : 'blocked'
      case 'Escape':
        if (this._editing) {
          this._editing = false
          return 'handled'
        }
        return 'back'
      default:
        break
    }
    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return 'nothing'
    if (/[0-9,]/.test(e.key)) {
      this.typeChar(e.key)
      return 'handled'
    }
    this.seek(e.key, now)
    return 'handled'
  }
}
