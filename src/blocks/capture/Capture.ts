import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import type {
  CaptureCarrier,
  CapturedPick,
  ChangeCarrier,
  PendingKind,
  RunReportElement,
  SentRowsElement,
  WrittenRow,
} from '../../core/block/capability'
import { CALCULATIONS_PROP, type Calculation } from '../../core/data/calculation'
import { hasRecordNumber, LIST_GRID, listCapabilities, RecordList, tableStyle, type RowDecoration } from '../list'
import { closeLookupFor, coerceLookupColumns } from '../lookup/lookup'
import { alignSuggestionsFrom, suggestionStyle } from '../lookup/suggestionList'
import { reportPendingMarks } from '../../runtime/pendingState'
import { LEADS_TO_TYPING_ATTR } from '../../core/block/typingMarks'
import { enterCell, cellsInputStyle, cellsFields } from './cells'
import { captureDecoration, rowsBelow } from './body'
import { CAPTURE_COLUMNS_BINDING, greyLine, type CaptureColumn } from './column'
import { keyIntent } from './keys'
import { createLedger, type CaptureLedger } from './ledger'
import { captureRow } from './ledger/capturing'
import { runDone, writtenArrived } from './ledger/runReport'
import { rowView, touched } from './row/cellValues'
import { refreshRow } from './row/refresh'
import { firstCell, openCell } from './row/typing'
import { captureStyle } from './captureStyle'
import { splitStyle } from './split/splitStyle'
import { captureProperties, type CaptureValues } from './properties'
import { ROW_CAPTURED, rowCapturedRunner } from './rowCaptured'
import { WorkingRow } from './workingRow'
import type { SourceValue } from '../../core/block/sourceProperty'
import { TABLE_PART } from '../list/parts'

export interface Capture extends CaptureValues, SourceValue {}

export class Capture extends BlockElement implements CaptureCarrier, ChangeCarrier, SentRowsElement, RunReportElement {
  static readonly type = 'capture'
  static readonly tag = 'ff-capture'

  static override styles: CSSResultGroup = [
    BlockElement.styles,
    tableStyle,
    suggestionStyle,
    cellsInputStyle,
    captureStyle,
    splitStyle,
  ]

  static override busyLine = true

  @property({ attribute: false }) dataRows: string[][] = []

  @property({ attribute: false }) rawRows: unknown[] = []

  readonly paging = false

  private readonly _working = new WorkingRow(this)

  private _justCaptured = false

  private _dropAskAbove = false

  private readonly _ledger: CaptureLedger = createLedger({
    block: this,
    columns: () => this.listColumns(),
    layout: () => this._list.rowLayout(),
    calculations: () => this.listCalculations(),
    sourceId: () => this.source,
    rawRows: () => this.rawRows,
    dataRows: () => this.dataRows,
    report: () => this.requestUpdate(),
    focusCell: (index) => this.focusCaptureCell(index),
    captured: () => {
      this._justCaptured = true
      this.requestUpdate()
      this.focusCaptureCell(firstCell(this._ledger.row))
      this.showLastCaptured()
    },
    dropAsked: () => {
      this._dropAskAbove = this.endsUnderTyping()
      this.requestUpdate()
      this.focusDropAsk()
    },
    rowAdded: () => this.writeCaptured(),
    split: () => this.splits[0],
    splitOpened: () => {
      this.requestUpdate()
      this.focusSplit()
    },
  })

  private readonly writeCaptured = rowCapturedRunner(this, () => this._ledger.captured.hasFailed())

  private readonly _list: RecordList = new RecordList(this, {
    cellValue: (rawIndex, slot) => this._ledger.booked.cellValue(rawIndex, slot),
    decoration: () => this.rowsDecoration(),
    required: (slot) => this.listColumns()[slot]?.required === true,
    held: (slot) => this._ledger.row.cells.held.has(slot),
    greyLine: (shown) => greyLine(this.listColumns(), shown),
    bottom: () =>
      rowsBelow({
        ledger: this._ledger,
        working: this._working,
        block: this,
        preview: this.preview,
        sourceId: this.source,
        dropAskAbove: this._dropAskAbove,
        columns: () => this.listColumns(),
        backToTyping: () => this.backToTyping(),
        report: () => this.requestUpdate(),
      }),
  })

  get capturedRows(): readonly (readonly string[])[] {
    return this._ledger.captured.pendingMarks().map((v) => v.values)
  }

  get capturedKey(): readonly string[] {
    return this._ledger.captured.pendingMarks().map((v) => v.key)
  }

  get capturedPicks(): readonly (readonly CapturedPick[])[] {
    return this._ledger.captured.pendingMarks().map((v) => v.picks)
  }

  capturedColumn(key: string): readonly string[] {
    const slot = this.listColumns().findIndex((column) => column.key === key)
    return slot < 0 ? [] : this._ledger.captured.values.map((values) => values[slot] ?? '')
  }

  get changedRows(): readonly { record: string; values: readonly string[] }[] {
    return this._ledger.booked.changedRows
  }

  rowWrites(kind: PendingKind, key: string): void {
    this._ledger.outbound.writes(kind, key)
  }

  rowFailed(kind: PendingKind, key: string): void {
    this._ledger.outbound.failed(kind, key)
  }

  runDone(kind: PendingKind, written: readonly WrittenRow[]): void {
    runDone(this._ledger, kind, written)
    if (kind === 'captured') this._working.booked(written)
  }

  writtenArrived(): void {
    writtenArrived(this._ledger)
  }

  listColumns(): readonly CaptureColumn[] {
    return this.columns
  }

  listCalculations(): readonly Calculation[] {
    return this.calculations
  }

  private focusCaptureCell(index: number): void {
    void this.updateComplete.then(() => {
      enterCell(cellsFields(this.shadowRoot, '.row.capture', [index])[0])
    })
  }

  // The rule of the question at a booked row (list/rowAsk.ts): above the row
  // when one more row would not fit under it.
  private endsUnderTyping(): boolean {
    const row = this.shadowRoot?.querySelector<HTMLElement>('.row.capture')
    const body = row?.closest(`.${TABLE_PART.body}`)
    if (!row || !body) return true
    const frame = row.getBoundingClientRect()
    return frame.bottom + frame.height > body.getBoundingClientRect().bottom
  }

  private focusDropAsk(): void {
    void this.updateComplete.then(() => {
      this.shadowRoot?.querySelector<HTMLElement>('.row.capture > .row-ask > .ask-drop')?.focus({ preventScroll: true })
    })
  }

  private focusSplit(): void {
    void this.updateComplete.then(() => {
      const split = this.shadowRoot?.querySelector<HTMLElement>('.split')
      if (!split) return
      alignSuggestionsFrom(split)
      split.focus({ preventScroll: true })
    })
  }

  private backToTyping(): void {
    if (!this.preview) this.focusCaptureCell(openCell(this._ledger.row))
  }

  private readonly roomClick = (e: Event): void => {
    const spot = e.composedPath()[0]
    if (spot instanceof Element && spot.closest(`.${TABLE_PART.ruler}`) !== null) this.backToTyping()
  }

  private showLastCaptured(): void {
    void this.updateComplete.then(() => {
      const body = this.shadowRoot?.querySelector<HTMLElement>(`.${TABLE_PART.body}`)
      if (body) body.scrollTop = body.scrollHeight
    })
  }

  private get changePossible(): boolean {
    return this.source.trim() !== '' && hasRecordNumber(this)
  }

  private rowsDecoration(): (rawIndex: number) => RowDecoration {
    return captureDecoration({
      typable: this.changePossible,
      ledger: this._ledger,
    })
  }

  private readonly maskKey = (e: KeyboardEvent): void => {
    if (this.preview || keyIntent(e) !== 'insert') return
    const all = Array.from(this.ownerDocument.querySelectorAll<Capture>(Capture.tag))
    const path = e.composedPath()
    const responsible = all.find((t) => path.includes(t)) ?? all[0]
    if (responsible !== this) return
    e.preventDefault()
    this.focusCaptureCell(firstCell(this._ledger.row))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('keydown', this.maskKey)
    this.renderRoot.addEventListener('click', this.roomClick)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this.maskKey)
    this.renderRoot.removeEventListener('click', this.roomClick)
    closeLookupFor(this)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (refreshRow(this._ledger.row)) captureRow(this._ledger)
  }

  protected override updated(): void {
    reportPendingMarks(this)
    if (!this.preview) {
      this.renderRoot.querySelector(`.${TABLE_PART.ruler}`)?.setAttribute(LEADS_TO_TYPING_ATTR, '')
      this._working.followTyping(
        this.listColumns(),
        touched(this._ledger.row),
        () => rowView(this._ledger.row).map((cell) => cell.value),
        this._justCaptured ? this._ledger.captured.lastAdded : null,
      )
    }
    this._justCaptured = false
  }

  override render(): TemplateResult {
    return this._list.render()
  }
}

defineBlock(Capture, {
  name: 'Erfassung',
  category: 'input',
  properties: captureProperties,
  capabilities: [
    ...listCapabilities(CAPTURE_COLUMNS_BINDING, { kind: 'source', helpers: 'apart' }, [
      { key: ROW_CAPTURED, name: 'Zeile erfasst' },
    ]),
    { kind: 'capture' },
    { kind: 'change', key: 'editable' },
    { kind: 'holdsSent' },
    { kind: 'compute', prop: CALCULATIONS_PROP },
    {
      kind: 'lookupWindow',
      window: {
        entriesProp: 'columns',
        windowFields: (entry) => coerceLookupColumns((entry as CaptureColumn).windowColumns).map((c) => c.field),
      },
    },
  ],
  contracts: { capture: Capture, change: Capture, holdsSent: Capture },
  grid: LIST_GRID,
})
