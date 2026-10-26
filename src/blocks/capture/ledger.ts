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
import { createCaptureRow, type CaptureRow } from './row/captureRow'
import { rowView, touched, waitingSources } from './row/cellValues'
import { adopt } from './row/linkedRecords'
import { lookupAt, windowColumnsAt, type LookupSpot } from './row/lookupSpot'
import { refreshRow } from './row/refresh'
import { closeSplit, confirmSplit, splitAnchor } from './row/rowSplit'
import { adoptSuggestion, decideKey, setMark } from './row/suggestions'
import { emptyCell, firstCell, holdBack, leaveCell, neighbour, openCell, settleCell, typeCell } from './row/typing'
import { CapturedRows, type PendingRow } from './ledger/capturedRows'
import { Outbound, type RowState } from './ledger/outbound'
import { splitKey } from './split/splitKeys'
import type { SplitState } from './split/splitState'
import { captureContext, type CaptureContext } from './row/context'

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
    this.row = createCaptureRow({ ...host, context })
    this.captured = new CapturedRows({ ...host, context }, this.row, status)
    this.booked = new BookedRows({ ...host, firstCell: () => firstCell(this.row) }, status)
  }

  get typingColumn(): number {
    return this.row.cells.cursor
  }

  get mark(): number {
    return this.row.suggestions.mark
  }

  get suggestions(): readonly Entry[] {
    return this.row.suggestions.hit
  }

  get firstCell(): number {
    return firstCell(this.row)
  }

  get openCell(): number {
    return openCell(this.row)
  }

  get touched(): boolean {
    return touched(this.row)
  }

  rowView(): { value: string; automatic: boolean; held: boolean }[] {
    return rowView(this.row)
  }

  isHeld(index: number): boolean {
    return this.row.cells.held.has(index)
  }

  waitingSources(): Map<number, string> {
    return waitingSources(this.row)
  }

  type(index: number, text: string): void {
    typeCell(this.row, index, text)
  }

  leave(index: number): void {
    leaveCell(this.row, index)
  }

  empty(index: number): void {
    emptyCell(this.row, index)
  }

  setMark(mark: number): void {
    setMark(this.row, mark)
  }

  decideKey(index: number, key: string): KeyAction {
    return decideKey(this.row, index, key)
  }

  neighbour(from: number, direction: 1 | -1): number {
    return neighbour(this.row, from, direction)
  }

  focusCell(index: number): void {
    this.host.focusCell(index)
  }

  lookupAt(index: number): LookupSpot | null {
    return lookupAt(this.row, index)
  }

  adoptSuggestion(index: number, listIndex: number): void {
    adoptSuggestion(this.row, index, listIndex)
  }

  adopt(index: number, record: unknown): void {
    adopt(this.row, index, record)
  }

  refresh(): void {
    if (refreshRow(this.row)) this.captured.captureRow()
  }

  typedAt(index: number): string {
    return this.row.cells.typed.get(index) ?? ''
  }

  windowColumnsAt(index: number): Column[] {
    return windowColumnsAt(this.row, index)
  }

  jumpFrom(index: number): boolean {
    settleCell(this.row, index)
    const next = neighbour(this.row, index, 1)
    if (next !== -1) {
      this.host.focusCell(next)
      return true
    }
    return this.captured.captureRow()
  }

  enter(index: number): 'window' | 'done' {
    if (this.row.cells.held.has(index) && lookupAt(this.row, index) !== null) return 'window'
    settleCell(this.row, index)
    if (this.row.cells.held.has(index)) return 'done'
    if (this.captured.captureRow()) return 'done'
    const held = holdBack(this.row)
    if (held !== -1) {
      this.host.report()
      this.host.focusCell(held)
    }
    return 'done'
  }

  down(index: number): boolean {
    settleCell(this.row, index)
    const below = cellBelow(this.host.layout(), index)
    if (below === -1) return this.captured.captureRow()
    this.host.focusCell(below)
    return true
  }

  up(index: number): boolean {
    settleCell(this.row, index)
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
    return this.row.split.list
  }

  splitAnchor(): number {
    return splitAnchor(this.row)
  }

  splitKey(e: KeyboardEvent): void {
    const outcome = splitKey(this.row.split.list, e)
    if (outcome === 'nothing') return
    e.preventDefault()
    e.stopPropagation()
    if (outcome === 'done') {
      confirmSplit(this.row)
      this.captured.captureRow()
    } else if (outcome === 'back') {
      const anchor = this.splitAnchor()
      closeSplit(this.row)
      this.host.focusCell(anchor === -1 ? openCell(this.row) : anchor)
    }
    this.host.report()
  }

  splitToggle(index: number): void {
    this.row.split.list.toggle(index)
    this.host.report()
  }

  splitMark(index: number): void {
    this.row.split.list.setMark(index)
    this.host.report()
  }

  splitAmount(index: number): void {
    this.row.split.list.editAmount(index)
    this.host.report()
  }

  splitLeave(e: FocusEvent): void {
    const into = e.relatedTarget
    const from = e.currentTarget
    if (into instanceof Node && from instanceof Node && from.contains(into)) return
    closeSplit(this.row)
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
