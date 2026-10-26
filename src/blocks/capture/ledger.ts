import type { PendingKind, WrittenRow } from '../../core/block/capability'
import type { Calculation } from '../../core/data/calculation'
import type { Split } from '../../core/data/split'
import { inOpenPopup } from '../../runtime/steps/popup'
import type { Column } from '../parts/column'
import { cellAbove, cellBelow, stripeOf, type RowLayout } from '../parts/cell'
import type { Entry } from '../lookup/lookup'
import type { KeyAction } from '../lookup/suggestionState'
import type { CaptureColumn } from './column'
import { BookedRows } from './ledger/bookedRows'
import { CaptureRow, type LookupSpot } from './ledger/captureRow'
import { CapturedRows, type PendingRow } from './ledger/capturedRows'
import { Outbound, type RowState } from './ledger/outbound'
import type { SplitState } from './ledger/split'
import { captureContext, type CaptureContext } from './row'

export type { RowState } from './ledger/outbound'

interface CaptureHost {
  block: HTMLElement

  columns: () => readonly CaptureColumn[]

  layout: () => RowLayout

  calculations: () => readonly Calculation[]

  sourceId: () => string

  rawRows: () => readonly unknown[]

  dataRows: () => readonly string[][]

  report: () => void

  focusCell: (index: number) => void

  captured: () => void

  rowAdded: () => void

  split: () => Split | undefined

  splitOpened: () => void
}

export class CaptureLedger {
  private readonly host: CaptureHost

  private readonly outbound: Outbound

  private readonly row: CaptureRow

  private readonly captured: CapturedRows

  private readonly booked: BookedRows

  constructor(host: CaptureHost) {
    this.host = host
    const context = (): CaptureContext =>
      captureContext(host.block, host.columns(), host.sourceId(), host.calculations(), host.split())
    this.outbound = new Outbound(host.report)
    const status = this.outbound.shows.bind(this.outbound)
    this.row = new CaptureRow({ ...host, context })
    this.captured = new CapturedRows({ ...host, context }, this.row, status)
    this.booked = new BookedRows({ ...host, firstCell: () => this.row.firstCell }, status)
  }

  get typingColumn(): number {
    return this.row.typingColumn
  }

  get mark(): number {
    return this.row.mark
  }

  get suggestions(): readonly Entry[] {
    return this.row.suggestions
  }

  get firstCell(): number {
    return this.row.firstCell
  }

  get openCell(): number {
    return this.row.openCell
  }

  get touched(): boolean {
    return this.row.touched
  }

  rowView(): { value: string; automatic: boolean; held: boolean }[] {
    return this.row.rowView()
  }

  isHeld(index: number): boolean {
    return this.row.isHeld(index)
  }

  waitingSources(): Map<number, string> {
    return this.row.waitingSources()
  }

  type(index: number, text: string): void {
    this.row.type(index, text)
  }

  leave(index: number): void {
    this.row.leave(index)
  }

  empty(index: number): void {
    this.row.empty(index)
  }

  setMark(mark: number): void {
    this.row.setMark(mark)
  }

  decideKey(index: number, key: string): KeyAction {
    return this.row.decideKey(index, key)
  }

  neighbour(from: number, direction: 1 | -1): number {
    return this.row.neighbour(from, direction)
  }

  focusCell(index: number): void {
    this.host.focusCell(index)
  }

  lookupAt(index: number): LookupSpot | null {
    return this.row.lookupAt(index)
  }

  adoptSuggestion(index: number, listIndex: number): void {
    this.row.adoptSuggestion(index, listIndex)
  }

  adopt(index: number, record: unknown): void {
    this.row.adopt(index, record)
  }

  refresh(): void {
    if (this.row.refresh()) this.captured.captureRow()
  }

  typedAt(index: number): string {
    return this.row.typedAt(index)
  }

  windowColumnsAt(index: number): Column[] {
    return this.row.windowColumnsAt(index)
  }

  jumpFrom(index: number): boolean {
    this.row.settle(index)
    const next = this.row.neighbour(index, 1)
    if (next !== -1) {
      this.host.focusCell(next)
      return true
    }
    return this.captured.captureRow()
  }

  enter(index: number): 'window' | 'done' {
    if (this.row.isHeld(index) && this.row.lookupAt(index) !== null) return 'window'
    this.row.settle(index)
    if (this.row.isHeld(index)) return 'done'
    if (this.captured.captureRow()) return 'done'
    const held = this.row.holdBack()
    if (held !== -1) {
      this.host.report()
      this.host.focusCell(held)
    }
    return 'done'
  }

  down(index: number): boolean {
    this.row.settle(index)
    const below = cellBelow(this.host.layout(), index)
    if (below === -1) return this.captured.captureRow()
    this.host.focusCell(below)
    return true
  }

  up(index: number): boolean {
    this.row.settle(index)
    const layout = this.host.layout()
    const above = cellAbove(layout, index)
    if (above === -1) return this.booked.enterLast(stripeOf(layout, index))
    this.host.focusCell(above)
    return true
  }

  giveUp(): boolean {
    return this.captured.giveUp()
  }

  get split(): SplitState {
    return this.row.split
  }

  splitAnchor(): number {
    const key = this.row.split.split?.amountColumn ?? ''
    return this.host.columns().findIndex((c) => c.key === key)
  }

  splitKey(e: KeyboardEvent): void {
    const outcome = this.row.split.key(e)
    if (outcome === 'nothing') return
    e.preventDefault()
    e.stopPropagation()
    if (outcome === 'done') {
      this.row.confirmSplit()
      this.captured.captureRow()
    } else if (outcome === 'back') {
      const anchor = this.splitAnchor()
      this.row.closeSplit()
      this.host.focusCell(anchor === -1 ? this.row.openCell : anchor)
    }
    this.host.report()
  }

  splitToggle(index: number): void {
    this.row.split.toggle(index)
    this.host.report()
  }

  splitMark(index: number): void {
    this.row.split.setMark(index)
    this.host.report()
  }

  splitAmount(index: number): void {
    this.row.split.editAmount(index)
    this.host.report()
  }

  splitLeave(e: FocusEvent): void {
    const into = e.relatedTarget
    const from = e.currentTarget
    if (into instanceof Node && from instanceof Node && from.contains(into)) return
    this.row.closeSplit()
    this.host.report()
  }

  get capturedValues(): readonly (readonly string[])[] {
    return this.captured.values
  }

  get correctionSlot(): number | null {
    return this.captured.correctionSlot
  }

  pendingMarks(): PendingRow[] {
    return this.captured.pendingMarks()
  }

  hasFailed(): boolean {
    return this.captured.hasFailed()
  }

  capturedStatus(index: number): RowState {
    return this.captured.statusAt(index)
  }

  capturedKeyAt(index: number): string {
    return this.captured.keyAt(index)
  }

  bringBackCaptured(index: number): void {
    this.captured.bringBack(index)
  }

  removeCaptured(index: number): void {
    this.captured.remove(index)
  }

  get changedRows(): readonly { record: string; values: readonly string[] }[] {
    return this.booked.changedRows
  }

  statusOf(rawIndex: number): RowState {
    return this.booked.statusOf(rawIndex)
  }

  isChanged(rawIndex: number, columnsIndex: number): boolean {
    return this.booked.isChanged(rawIndex, columnsIndex)
  }

  cellValue(rawIndex: number, columnsIndex: number): string {
    return this.booked.cellValue(rawIndex, columnsIndex)
  }

  typeCell(rawIndex: number, columnsIndex: number, text: string): void {
    this.booked.typeCell(rawIndex, columnsIndex, text)
  }

  leaveCell(rawIndex: number, columnsIndex: number, text: string): void {
    this.booked.leaveCell(rawIndex, columnsIndex, text)
  }

  keyCell(rawIndex: number, columnsIndex: number, e: KeyboardEvent): void {
    this.booked.keyCell(rawIndex, columnsIndex, e)
  }

  writes(kind: PendingKind, key: string): void {
    this.outbound.writes(kind, key)
  }

  failed(kind: PendingKind, key: string): void {
    this.outbound.failed(kind, key)
  }

  runDone(kind: PendingKind, written: readonly WrittenRow[]): void {
    const keys = written.map((z) => z.key)
    this.outbound.done(kind, keys)
    if (kind === 'captured') {
      if (this.captured.markWritten(written, inOpenPopup(this.host.block))) this.host.report()
      return
    }
    this.booked.takeOut(written.filter((z) => z.shown !== true).map((z) => z.key))
    this.booked.forget(written.filter((z) => z.shown === true).map((z) => z.key))
  }

  writtenArrived(): void {
    if (!this.captured.hasWritten() && !this.booked.hasInFlight()) return
    this.captured.dropWritten()
    this.booked.dropInFlight()
    this.host.report()
  }
}
