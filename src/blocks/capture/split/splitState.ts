import { asNumber, numberText } from '../../../core/data/number'
import type { Split } from '../../../core/data/split'
import { plainText } from '../../parts/cellSearch'
import { splitColumnText, splitStock } from './splitRecords'

export interface SplitPick {
  record: unknown
  amount: string
}

// Amounts of the split, suggested or summed up, show at most this many decimals.
export const SPLIT_DECIMALS = 3

// Letters typed within this pause search on from the letters before.
const SEARCH_PAUSE_MS = 900

// The open split list: its records, the amount picked per record, the marked
// row and the amount being typed.
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
    const columns = this.spec?.columns ?? []
    return columns.length > 0 && columns.every((c) => splitColumnText(a, c) === splitColumnText(b, c))
  }

  amountOf(row: unknown): string | undefined {
    return this.picks.get(row)
  }

  stockOf(row: unknown): number | null {
    return this.spec === null ? null : splitStock(this.spec, row)
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

  setBlocked(blocked: boolean): void {
    this._blocked = blocked
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

  stopEditing(): void {
    this._editing = false
  }

  private suggested(row: unknown): string {
    const stock = this.stockOf(row)
    const open = this._total === null ? null : this._total - this.sum(row)
    const wanted = open === null ? stock : stock === null ? open : Math.min(open, stock)
    return wanted === null || wanted <= 0 ? '' : numberText(wanted, SPLIT_DECIMALS)
  }

  typeChar(char: string): void {
    const row = this._rows[this._mark]
    if (row === undefined) return
    const before = this._editing ? (this.picks.get(row) ?? '') : ''
    if (char === ',' && before.includes(',')) return
    this.picks.set(row, before + char)
    this._editing = true
  }

  backspace(): void {
    const row = this._rows[this._mark]
    if (row === undefined || !this.picks.has(row)) return
    const before = this.picks.get(row) ?? ''
    this.picks.set(row, before.slice(0, -1))
    this._editing = true
  }

  dropMarked(): void {
    const row = this._rows[this._mark]
    if (row !== undefined) this.picks.delete(row)
    this._editing = false
  }

  seek(char: string, now: number): void {
    const text = now - this.search.at > SEARCH_PAUSE_MS ? char : this.search.text + char
    this.search = { text, at: now }
    const wanted = plainText(text)
    const columns = this.spec?.columns ?? []
    const hit = this._rows.findIndex((row) =>
      columns.some((c) => plainText(splitColumnText(row, c)).startsWith(wanted)),
    )
    if (hit !== -1) this.setMark(hit)
  }
}
