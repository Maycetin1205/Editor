import type { PendingKind, WrittenRow } from '../../../core/block/capability'
import type { CaptureColumn } from '../column'
import type { CaptureContext } from '../row/context'
import { clearRow, type CaptureRow } from '../row/captureRow'
import { touched, valueIn } from '../row/cellValues'
import { computeCells } from '../row/computedCells'
import { adoptRow, helpersNow, type Helpers } from '../row/rowHelpers'
import { openSplit } from '../row/rowSplit'
import { firstCell, holdBack } from '../row/typing'
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

interface CapturedRowsHost {
  context: () => CaptureContext

  columns: () => readonly CaptureColumn[]

  report: () => void

  focusCell: (index: number) => void

  captured: () => void

  rowAdded: () => void

  splitOpened: () => void
}

type Status = (kind: PendingKind, key: string, base: RowsStatus) => RowState

export class CapturedRows {
  private readonly host: CapturedRowsHost

  private readonly row: CaptureRow

  private readonly status: Status

  private rows: CapturedRow[] = []

  private nextKey = 1

  private correction: { row: CapturedRow; slot: number } | null = null

  constructor(host: CapturedRowsHost, row: CaptureRow, status: Status) {
    this.host = host
    this.row = row
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

  keyAt(index: number): string {
    return this.rows[index]?.key ?? ''
  }

  statusAt(index: number): RowState {
    const row = this.rows[index]
    return this.status('captured', row?.key ?? '', row?.written === undefined ? 'captured' : 'written')
  }

  captureRow(): boolean {
    const outcome = this.capture(this.host.context())
    if (outcome === 'nothing') return false
    if (outcome === 'split') this.host.splitOpened()
    else if (outcome === 'captured') this.host.captured()
    else if (outcome === 'waits') this.row.cells.captureAsked = true
    else {
      this.host.report()
      this.host.focusCell(outcome.missing)
    }
    return true
  }

  private capture(context: CaptureContext): 'captured' | 'nothing' | 'waits' | 'split' | { missing: number } {
    computeCells(this.row, context)
    const values = context.columns.map((_, i) => valueIn(this.row, context, i))
    const back = this.correction
    if (values.every((w) => w === '')) {
      if (!back) return 'nothing'
      this.correction = null
      clearRow(this.row)
      return 'captured'
    }
    const missing = holdBack(this.row)
    if (missing !== -1) return { missing }
    if (this.row.cells.waiting.size > 0) return 'waits'
    if (openSplit(this.row, context) !== 'none') return 'split'
    if (back) {
      this.rows = [
        ...this.rows.slice(0, back.slot),
        { key: this.topKey, values, ...helpersNow(this.row) },
        ...this.rows.slice(back.slot),
      ]
      this.nextKey += 1
      this.correction = null
    } else {
      this.rows = [...this.rows, { key: this.topKey, values, ...helpersNow(this.row) }]
      this.nextKey += 1
    }
    clearRow(this.row)
    this.host.rowAdded()
    return 'captured'
  }

  bringBack(index: number): void {
    const context = this.host.context()
    const row = this.rows[index]
    if (!row || row.written !== undefined || this.isOut(row)) return
    const before = this.capture(context)
    if (typeof before === 'object') {
      this.host.report()
      this.host.focusCell(before.missing)
      return
    }
    if (before === 'waits') return
    if (before === 'split') {
      this.host.splitOpened()
      return
    }
    const now = this.rows.indexOf(row)
    if (now === -1) return
    this.rows = this.rows.filter((_, i) => i !== now)
    this.correction = { row, slot: now }
    adoptRow(this.row, context, row.values, row)
    this.host.report()
    this.host.focusCell(firstCell(this.row))
  }

  giveUp(): boolean {
    const back = this.correction
    if (back === null && !touched(this.row)) return false
    if (back !== null) {
      this.rows = [...this.rows.slice(0, back.slot), back.row, ...this.rows.slice(back.slot)]
      this.correction = null
    }
    clearRow(this.row)
    this.host.report()
    this.host.focusCell(firstCell(this.row))
    return true
  }

  remove(index: number): void {
    if (index < 0 || index >= this.rows.length) return
    this.rows = this.rows.filter((_, i) => i !== index)
    if (this.correction !== null && index < this.correction.slot) {
      this.correction = { ...this.correction, slot: this.correction.slot - 1 }
    }
    this.host.report()
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
