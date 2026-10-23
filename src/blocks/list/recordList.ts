import { html, nothing, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { ViewChoices } from './viewChoices'
import { giverIdOf } from '../../runtime/selection'
import { ROW_CONFIRM_EVENT } from '../../core/data/steps/confirm'
import { RowAsk } from './rowAsk'
import { TAKES_KEYS_ATTR } from '../../core/block/typingMarks'
import { SUBLINE_HEIGHT, type MeasureTarget } from './pageSize'
import { sendPropChange } from '../base/BlockElement'
import { reportsHeads } from '../base/headsReport'
import { columnsView, figureOf, type Column, type ColumnView } from '../parts/column'
import { WidthsState } from './columnWidth'
import { ColumnsChoiceState } from './columnPicker'
import { tableRenderModel } from './tableModel'
import type { ListSettings } from './listDeclaration'
import type { RowLayout } from '../parts/cell'
import { WITHOUT_DECORATION, tableFoot, tableBody, type RowsBelow, type RowDecoration } from './tableBody'
import { activateRow, actionKeyAtRow, takesActionKey, RowsChoice, rowDouble } from './rowActivation'
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

interface ListHooks {
  cellValue: (rawIndex: number, slot: number) => string

  decoration: () => (rawIndex: number | null) => RowDecoration

  required: (slot: number) => boolean

  held: (slot: number) => boolean

  greyLine: (shown: readonly number[]) => ReadonlyMap<number, number>

  bottom: () => RowsBelow | null
}

interface ListShowQuestion {
  preview: boolean

  rowsFrom: RowsFrom

  columns: readonly Column[]

  rowCount: number
}

interface ListShows {
  rows: boolean

  empty: boolean
}

function listEmptyState(question: ListShowQuestion): ListShows {
  if (question.preview) return { rows: false, empty: false }

  const anyColumnBound = question.columns.some((column) => column.field.trim() !== '')
  const empty = question.rowCount === 0 || (question.rowsFrom === 'source' && !anyColumnBound)
  return { rows: true, empty }
}

export class RecordList implements ReactiveController {
  private readonly el: ListElement

  private readonly hooks: ListHooks | null

  private _rowsFrom: RowsFrom = 'source'

  private readonly _widths: WidthsState

  private readonly _view: ViewChoices

  private readonly _choice: ColumnsChoiceState

  private readonly _rowsChoice: RowsChoice

  private readonly _ask: RowAsk

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

  private visibleView(): ColumnView {
    const el = this.el
    return columnsView(el.listColumns(), el.preview, this._choice.away())
  }

  rowLayout(): RowLayout {
    const visible = this.visibleView()
    const columns = this.el.listColumns()
    const calculations = this.el.listCalculations()
    const figures = columns.map((column) => figureOf(column, calculations))
    const under = new Map<number, { column: Column; slot: number }>()
    for (const [anchor, slot] of this.hooks?.greyLine(visible.slots) ?? []) {
      under.set(anchor, { column: columns[slot], slot })
    }
    if (under.size === 0) return { main: visible, under, figures }
    const grey = new Set([...under.values()].map((sub) => sub.slot))
    const main: { columns: Column[]; slots: number[] } = { columns: [], slots: [] }
    visible.columns.forEach((column, i) => {
      if (grey.has(visible.slots[i])) return
      main.columns.push(column)
      main.slots.push(visible.slots[i])
    })
    return { main, under, figures }
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

  private readonly actionKey = (e: KeyboardEvent): void => {
    const run = actionKeyAtRow(
      this.el,
      this._rowsChoice,
      e,
      (key) => this.rowKeys().indexOf(key),
      (trait) => this._ask.takes(trait),
    )
    if (run) this._ask.track(run.trait, run.result)
  }

  private readonly locksReload = (e: KeyboardEvent): void => {
    if (!this.el.preview && e.key === 'F5' && !e.ctrlKey && !e.metaKey) e.preventDefault()
  }

  hostConnected(): void {
    const el = this.el
    el.addEventListener('keydown', this.actionKey)
    el.addEventListener('keydown', this.locksReload)
    el.addEventListener(ROW_CONFIRM_EVENT, this._ask.asked)
    this._ask.connect()
    if (this._rowsFrom === 'source') followSource(el)
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
    this.el.shadowRoot
      ?.querySelector('.table')
      ?.toggleAttribute(TAKES_KEYS_ATTR, !this.el.preview && takesActionKey(this.el))
  }

  hostDisconnected(): void {
    const el = this.el
    el.removeEventListener('keydown', this.actionKey)
    el.removeEventListener('keydown', this.locksReload)
    el.removeEventListener(ROW_CONFIRM_EVENT, this._ask.asked)
    this._ask.disconnect()
    this._choice.detach()
    this._view.detach()
    unfollowSource(el)
  }

  private openColumnPicker(e: MouseEvent): void {
    const frame = this.el.shadowRoot?.querySelector('.table')?.getBoundingClientRect()
    if (!frame) return
    this._choice.openAt(e, frame)
  }

  render(): TemplateResult {
    const el = this.el
    const columns = el.listColumns()
    const layout = this.rowLayout()
    const visible = layout.main
    const subHeight = layout.under.size > 0 ? SUBLINE_HEIGHT : 0
    const bottom = this.hooks?.bottom() ?? null
    const own = this.hooks?.decoration() ?? ((): RowDecoration => WITHOUT_DECORATION)
    const decoration = (rawIndex: number | null): RowDecoration => this._ask.decorate(own(rawIndex), rawIndex)
    const shows = listEmptyState({
      preview: el.preview,
      rowsFrom: this._rowsFrom,
      columns,
      rowCount: el.dataRows.length,
    })

    const view = tableRenderModel({
      columns,
      figures: layout.figures,
      rendered: visible.columns,
      slots: visible.slots,
      widthOf: (i) => this._widths.widthOf(i),
      showsRows: shows.rows,
      empty: shows.empty,
      dataRows: el.dataRows,
      searchText: this._view.searchText,
      sortColumn: this._view.sortColumn,
      sortAscending: this._view.sortAscending,
      wantedPage: this._view.page,
      measured: this._view.metrics,
      takenRows: bottom?.count ?? 0,
      valueAt: (row, column) => this.cellValue(row, column),
      paging: el.paging,
    })
    return html`<div class="table" style=${styleMap({
      '--tick': `${view.tick}px`,
      '--row-height': `${view.tick}px`,
      '--sub-height': `${subHeight}px`,
      '--record-height': `${view.tick + subHeight}px`,
    })}>
      ${tableBody(
        {
          columns: visible.columns,
          slots: visible.slots,
          cols: view.cols,
          layout,
          editable: el.editable,
          preview: el.preview,
          columnPickerOn: this.columnPickerOn,
          columnPicker:
            this._choice.open === null
              ? null
              : {
                  selectable: columns.filter((column) => column.hidden !== true),
                  away: this._choice.away(),
                  left: this._choice.open.left,
                  top: this._choice.open.top,
                },
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
        },
        {
          setSearchText: (text) => this._view.setSearchText(text),
          openColumnPicker: (e) => this.openColumnPicker(e),
          columnPicker: {
            toggle: (key) => this._choice.toggle(key),
            showAll: () => this._choice.showAll(),
            close: () => this._choice.close(),
          },
          widths: this._widths.hostForDrag(),
          clickHead: (i) => this._view.clickSort(i),
          activateRow: (rawIndex, viewIndex) => {
            activateRow(el, this._rowsChoice, el.rawRows, rawIndex, viewIndex)
            el.requestUpdate()
          },
          rowDouble: (rawIndex) => rowDouble(el, el.rawRows, rawIndex),
        },
      )}
      ${tableFoot(
        {
          showsRows: view.showsRows,
          visible: view.total,
          total: el.dataRows.length,
          searchesActive: this._view.searchesActive,
          page: view.page,
          pageCount: view.pageCount,
          paging: el.paging,
          totals: view.totals,
          empty: view.empty,
        },
        {
          page: (to) => this._view.goToPage(to),
        },
      )}
    </div>`
  }
}
