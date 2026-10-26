import type { PendingKind, WrittenRow } from '../../../core/block/capability'
import type { Helpers } from '../row/rowHelpers'
import type { SplitPick } from '../split/splitState'
import type { RowState, RowsStatus } from './outbound'

type CapturedRow = Helpers & {
  key: string

  values: string[]

  written?: { record: string }
}

interface PendingRow {
  key: string

  values: readonly string[]

  picks: readonly SplitPick[]
}

type Status = (kind: PendingKind, key: string, base: RowsStatus) => RowState

// The rows captured from the typing row and not yet booked, in their order,
// with the gap of a row taken back into the typing row to be corrected.
export class CapturedRows {
  private readonly report: () => void

  private readonly status: Status

  private rows: CapturedRow[] = []

  private nextKey = 1

  private correction: { row: CapturedRow; slot: number } | null = null

  // The key of the row the typing row went into last; null once a corrected
  // row was emptied and went for good.
  private added: string | null = null

  // The corrected row was emptied: it asks before it goes.
  private asked = false

  // The key of a row double-clicked while the typing row waited for a
  // source: it comes back once the typing row has gone.
  private wanted: string | null = null

  constructor(report: () => void, status: Status) {
    this.report = report
    this.status = status
  }

  get values(): readonly (readonly string[])[] {
    return this.rows.map((z) => z.values)
  }

  get correctionSlot(): number | null {
    return this.correction === null ? null : this.correction.slot
  }

  private get topKey(): string {
    return `e${this.nextKey}`
  }

  pendingMarks(): PendingRow[] {
    return this.rows
      .filter((z) => z.written === undefined && !this.isOut(z))
      .map((z) => ({ key: z.key, values: z.values as readonly string[], picks: z.picks }))
  }

  private isOut(row: CapturedRow): boolean {
    return this.status('captured', row.key, 'captured').status === 'writes'
  }

  hasFailed(): boolean {
    return this.rows.some((row) => this.status('captured', row.key, 'captured').status === 'error')
  }

  get lastAdded(): string | null {
    return this.added
  }

  keyAt(index: number): string {
    return this.rows[index]?.key ?? ''
  }

  indexOfKey(key: string): number {
    return this.rows.findIndex((row) => row.key === key)
  }

  get wantedBack(): string | null {
    return this.wanted
  }

  wantBack(key: string | null): void {
    this.wanted = key
  }

  statusAt(index: number): RowState {
    const row = this.rows[index]
    return this.status('captured', row?.key ?? '', row?.written === undefined ? 'captured' : 'written')
  }

  get correcting(): boolean {
    return this.correction !== null
  }

  get dropAsked(): boolean {
    return this.asked
  }

  askDrop(): void {
    this.asked = this.correction !== null
  }

  // The answer was no: the row stays in the typing row to be corrected.
  keepCorrection(): void {
    this.asked = false
  }

  // Into the gap of a corrected row, else at the end.
  add(values: string[], helpers: Helpers): void {
    const row = { key: this.topKey, values, ...helpers }
    this.added = row.key
    this.asked = false
    const back = this.correction
    if (back) {
      this.rows = [...this.rows.slice(0, back.slot), row, ...this.rows.slice(back.slot)]
      this.nextKey += 1
      this.correction = null
    } else {
      this.rows = [...this.rows, row]
      this.nextKey += 1
    }
  }

  // A row written, or on its way, stays as it is.
  correctable(index: number): CapturedRow | undefined {
    const row = this.rows[index]
    return !row || row.written !== undefined || this.isOut(row) ? undefined : row
  }

  // Leaves a gap where the row stood; false when the row is gone.
  takeBack(row: CapturedRow): boolean {
    const now = this.rows.indexOf(row)
    if (now === -1) return false
    this.rows = this.rows.filter((_, i) => i !== now)
    this.correction = { row, slot: now }
    this.asked = false
    return true
  }

  // A corrected row emptied in the typing row goes for good.
  dropCorrection(): void {
    this.correction = null
    this.added = null
    this.asked = false
  }

  restoreCorrection(): void {
    const back = this.correction
    if (back === null) return
    this.rows = [...this.rows.slice(0, back.slot), back.row, ...this.rows.slice(back.slot)]
    this.correction = null
    this.asked = false
  }

  remove(index: number): void {
    if (index < 0 || index >= this.rows.length) return
    this.rows = this.rows.filter((_, i) => i !== index)
    if (this.correction !== null && index < this.correction.slot) {
      this.correction = { ...this.correction, slot: this.correction.slot - 1 }
    }
    this.report()
  }

  markWritten(written: readonly WrittenRow[], keepShown: boolean): boolean {
    if (written.length === 0) return false
    const marks = new Map(written.map((g) => [g.key, g]))
    const away = new Set<number>()
    let changed = false
    this.rows = this.rows.map((z, slot) => {
      const mark = z.written === undefined ? marks.get(z.key) : undefined
      if (mark === undefined) return z
      changed = true
      if (mark.shown === true && !keepShown) away.add(slot)
      return { ...z, written: { record: mark.record } }
    })
    if (away.size > 0) {
      this.rows = this.rows.filter((_, slot) => !away.has(slot))
      this.slideCorrection(away)
    }
    return changed
  }

  hasWritten(): boolean {
    return this.rows.some((row) => row.written !== undefined)
  }

  dropWritten(): void {
    const away = new Set<number>()
    this.rows.forEach((row, slot) => {
      if (row.written !== undefined) away.add(slot)
    })
    this.rows = this.rows.filter((_, slot) => !away.has(slot))
    this.slideCorrection(away)
  }

  private slideCorrection(away: ReadonlySet<number>): void {
    const back = this.correction
    if (back === null) return
    const before = [...away].filter((slot) => slot < back.slot).length
    if (before > 0) this.correction = { ...back, slot: back.slot - before }
  }
}
