import { html, nothing, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { giverIdOf } from '../../runtime/selection'
import { ROW_CONFIRM_EVENT } from '../../runtime/steps/confirm'
import { sendPropChange } from '../base/BlockElement'
import { reportsHeads } from '../base/headsReport'
import type { Column } from '../parts/column'
import type { RowLayout } from '../parts/cell'
import { ViewChoices } from './viewChoices'
import { RowAsk } from './rowAsk'
import { SUBLINE_HEIGHT } from './pageSize'
import type { MeasureTarget } from './bodyMeasure'
import { WidthsState } from './columnWidth'
import { ColumnsChoiceState } from './columnPicker'
import { tableRenderModel, type TableRenderModel } from './tableModel'
import type { ListSettings } from './listDeclaration'
import { columnsView, listEmptyState, rowLayoutOf } from './listLayout'
import { WITHOUT_DECORATION, type ListHooks, type RowDecoration, type RowsBelow } from './listHooks'
import { tableBody, type BodyAct, type BodyPlacement } from './tableBody'
import { tableFoot } from './tableFoot'
import { activateRow, RowsChoice, rowDouble } from './rowActivation'
import { HostKeys } from './hostKeys'
import {
  followSource,
  unfollowSource,
  cellsForHandedRows,
  rowsKeysOf,
  type HandedRow,
  type RowsFrom,
  type RowsElement,
} from './sourceRows'

interface ListElement extends RowsElement, ListSettings, MeasureTarget, ReactiveControllerHost {
  readonly columns: readonly Column[]
  readonly preview: boolean
  editable: boolean
  hasUpdated: boolean
}

// Ties the parts of the list to its block: where the rows come from, the
// operator's choices, the keys on the block, and drawing it all.
export class RecordList implements ReactiveController {
  private readonly el: ListElement
  private readonly hooks: ListHooks | null
  private _rowsFrom: RowsFrom = 'source'
  private readonly _widths: WidthsState
  private readonly _view: ViewChoices
  private readonly _choice: ColumnsChoiceState
  private readonly _rowsChoice: RowsChoice
  private readonly _ask: RowAsk
  private readonly _hostKeys: HostKeys
  private _columns: readonly Column[] | null = null
  private _keys: { rows: readonly unknown[]; keys: readonly string[] } = { rows: [], keys: [] }

  constructor(el: ListElement, hooks: ListHooks | null = null) {
    this.el = el
    this.hooks = hooks
    this._widths = new WidthsState({
      preview: () => el.preview,
      fullSlot: (rendered) => this.rowLayout().main.slots[rendered] ?? rendered,
      columnsList: () => [...el.listColumns()],
      writeColumns: (columns) => sendPropChange(el, 'columns', columns),
      report: () => el.requestUpdate(),
    })
    this._view = new ViewChoices(
      el,
      () => el.listColumns(),
      () => this.subHeight(),
    )
    this._choice = new ColumnsChoiceState({
      block: el,
      on: () => this.columnPickerOn,
      report: () => el.requestUpdate(),
      forgetWidths: () => this._widths.forget(),
    })
    this._rowsChoice = new RowsChoice(el)
    this._ask = new RowAsk(
      el,
      () => this._rowsChoice.slotIn(el.rawRows),
      (rawIndex) => this.keyOf(rawIndex),
    )
    this._hostKeys = new HostKeys(el, this._rowsChoice, this._ask, (key) => this.rowKeys().indexOf(key))
    el.addController(this)
    reportsHeads(el)
  }

  get rowsFrom(): RowsFrom {
    return this._rowsFrom
  }

  set rowsFrom(value: RowsFrom) {
    if (value === this._rowsFrom) return
    this._rowsFrom = value
    this.reset()
    if (this.el.isConnected) {
      if (value === 'handed') unfollowSource(this.el)
      else followSource(this.el)
    }
    this.el.requestUpdate()
  }

  set handedRows(rows: readonly HandedRow[]) {
    const el = this.el
    const cells = cellsForHandedRows(rows, el.listColumns(), el.listCalculations())
    el.rawRows = cells.rawRows
    el.dataRows = cells.dataRows
    this._rowsChoice.forget()
    this._view.invalidate()
    el.requestUpdate()
  }

  rowLayout(): RowLayout {
    const visible = columnsView(this.el.listColumns(), this.el.preview, this._choice.away())
    const greyLine = this.hooks?.greyLine(visible.slots) ?? []
    return rowLayoutOf(this.el.listColumns(), this.el.listCalculations(), visible, greyLine)
  }

  private subHeight(): number {
    return this.rowLayout().under.size > 0 ? SUBLINE_HEIGHT : 0
  }

  reset(): void {
    const el = this.el
    el.rawRows = []
    el.dataRows = []
    this._rowsChoice.forget()
    this._view.reset()
  }

  focusSearch(): boolean {
    return this._view.focusSearch()
  }

  setSearchText(text: string): void {
    this._view.setSearchText(text)
    this.el.requestUpdate()
  }

  private get columnPickerOn(): boolean {
    return this.el.columnPicker && !this.el.preview
  }

  private rowKeys(): readonly string[] {
    const rows = this.el.rawRows
    if (this._keys.rows !== rows) this._keys = { rows, keys: rowsKeysOf(this.el, rows) }
    return this._keys.keys
  }

  private keyOf(rawIndex: number): string {
    return this.rowKeys()[rawIndex] ?? String(rawIndex)
  }

  private cellValue(rawIndex: number, slot: number): string {
    if (this.hooks) return this.hooks.cellValue(rawIndex, slot)
    return this.el.dataRows[rawIndex]?.[slot] ?? ''
  }

  hostConnected(): void {
    this._hostKeys.connect()
    this.el.addEventListener(ROW_CONFIRM_EVENT, this._ask.asked)
    this._ask.connect()
    if (this._rowsFrom === 'source') followSource(this.el)
    this._view.observe()
  }

  hostUpdate(): void {
    if (this.el.columns === this._columns) return
    this._columns = this.el.columns
    this._widths.forget()
  }

  hostUpdated(): void {
    if (!this.el.hasUpdated) this._view.observe()
    this._view.afterRender()
    this._ask.checkShown()
    this._hostKeys.markTable()
  }

  hostDisconnected(): void {
    this._hostKeys.disconnect()
    this.el.removeEventListener(ROW_CONFIRM_EVENT, this._ask.asked)
    this._ask.disconnect()
    this._choice.detach()
    this._view.detach()
    unfollowSource(this.el)
  }

  private openColumnPicker(e: MouseEvent): void {
    const frame = this.el.shadowRoot?.querySelector('.table')?.getBoundingClientRect()
    if (!frame) return
    this._choice.openAt(e, frame)
  }

  render(): TemplateResult {
    const layout = this.rowLayout()
    const subHeight = layout.under.size > 0 ? SUBLINE_HEIGHT : 0
    const bottom = this.hooks?.bottom() ?? null
    const decoration = this.decoration()
    const view = this.renderModel(layout, bottom?.count ?? 0)
    return html`<div class="table" style=${styleMap({
      '--tick': `${view.tick}px`,
      '--row-height': `${view.tick}px`,
      '--sub-height': `${subHeight}px`,
      '--record-height': `${view.tick + subHeight}px`,
    })}>
      ${tableBody(this.bodyPlacement(layout, view, decoration, bottom), this.bodyAct())}
      ${tableFoot(view, { page: (to) => this._view.goToPage(to) })}
    </div>`
  }

  // The block's own look of a row, with the question before a row goes on top.
  private decoration(): (rawIndex: number | null) => RowDecoration {
    const own = this.hooks?.decoration() ?? ((): RowDecoration => WITHOUT_DECORATION)
    return (rawIndex) => this._ask.decorate(own(rawIndex), rawIndex)
  }

  private renderModel(layout: RowLayout, takenRows: number): TableRenderModel {
    const el = this.el
    const columns = el.listColumns()
    const shows = listEmptyState({
      preview: el.preview,
      rowsFrom: this._rowsFrom,
      columns,
      rowCount: el.dataRows.length,
    })
    return tableRenderModel({
      columns,
      figures: layout.figures,
      rendered: layout.main.columns,
      slots: layout.main.slots,
      widthOf: (i) => this._widths.widthOf(i),
      showsRows: shows.rows,
      empty: shows.empty,
      dataRows: el.dataRows,
      searchText: this._view.searchText,
      sortColumn: this._view.sortColumn,
      sortAscending: this._view.sortAscending,
      wantedPage: this._view.page,
      measured: this._view.metrics,
      takenRows,
      valueAt: (row, column) => this.cellValue(row, column),
      paging: el.paging,
    })
  }

  private bodyPlacement(
    layout: RowLayout,
    view: TableRenderModel,
    decoration: (rawIndex: number | null) => RowDecoration,
    bottom: RowsBelow | null,
  ): BodyPlacement {
    const el = this.el
    const visible = layout.main
    return {
      columns: visible.columns,
      slots: visible.slots,
      cols: view.cols,
      layout,
      editable: el.editable,
      preview: el.preview,
      columnPickerOn: this.columnPickerOn,
      columnPicker: this._choice.placement(el.listColumns()),
      selectionSemantics: giverIdOf(el) !== '',
      showSearch: el.search,
      searchText: this._view.searchText,
      sortColumn: this._view.sortColumn,
      sortAscending: this._view.sortAscending,
      rows: view.rows,
      keyOf: (rawIndex) => this.keyOf(rawIndex),
      valueAt: (row, column) => this.cellValue(row, column),
      rulerTicks: view.rulerTicks,
      showsRows: view.showsRows,
      selectionIndex: this._rowsChoice.slotIn(el.rawRows),
      decoration,
      required: (slot) => this.hooks?.required(slot) ?? false,
      held: (slot) => this.hooks?.held(slot) ?? false,
      bottom:
        bottom === null
          ? nothing
          : bottom.render({ view: visible, cols: view.cols, layout, rulerTicks: view.rulerTicks }),
    }
  }

  private bodyAct(): BodyAct {
    const el = this.el
    return {
      setSearchText: (text) => this._view.setSearchText(text),
      openColumnPicker: (e) => this.openColumnPicker(e),
      columnPicker: this._choice.act(),
      widths: this._widths.hostForDrag(),
      clickHead: (i) => this._view.clickSort(i),
      activateRow: (rawIndex, viewIndex) => {
        activateRow(el, this._rowsChoice, el.rawRows, rawIndex, viewIndex)
        el.requestUpdate()
      },
      rowDouble: (rawIndex) => rowDouble(el, el.rawRows, rawIndex),
    }
  }
}
