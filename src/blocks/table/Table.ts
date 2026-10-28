import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { bindable } from '../../core/block/capability'
import type { Calculation } from '../../core/data/calculation'
import { BlockElement, defineBlock } from '../base/BlockElement'
import {
  LIST_EVENTS,
  LIST_GRID,
  RecordList,
  tableStyle,
  WITHOUT_DECORATION,
  type HandedRow,
  type RowsFrom,
} from '../list'
import { AVATAR_SPOT, avatarStyle, cardSpotStyle } from '../parts/card'
import { COLUMNS_BINDING, type Column } from '../parts/column'
import { CardRows } from './cardRows'
import { listLookStyle } from './listLookStyle'
import { AS_LIST, AS_TABLE, CARD_SPOTS, GIVES_CHOICE, tableProperties, type TableValues } from './properties'

export interface Table extends TableValues {}

// The records of a source as a table, or as a list of cards. Both run on the
// same list engine: rows, choice, keys and loading are the same; a list has
// no head and no foot, and one column whose cell is the card of the record.
export class Table extends BlockElement {
  static readonly type = 'table'
  static readonly tag = 'ff-table'

  static override styles: CSSResultGroup = [BlockElement.styles, tableStyle, avatarStyle, cardSpotStyle, listLookStyle]

  static override busyLine = true

  @property({ attribute: false }) dataRows: string[][] = []

  @property({ attribute: false }) rawRows: unknown[] = []

  // How many rows the table holds, for an area that counts them in its head.
  get rowCount(): number {
    return this.rawRows.length
  }

  private get asList(): boolean {
    return this.look === 'list'
  }

  private readonly cards = new CardRows(this, (event) => this.reportSpot(event))

  private readonly _list = new RecordList(
    this,
    {
      cellValue: (rawIndex, slot) =>
        this.asList ? this.cards.heading(rawIndex) : (this.dataRows[rawIndex]?.[slot] ?? ''),
      decoration: () => (this.asList ? this.cards.decoration : () => WITHOUT_DECORATION),
      required: () => false,
      held: () => false,
      greyLine: () => new Map(),
      bottom: () => (this.asList && this.preview ? this.cards.sampleRow() : null),
    },
    {
      plain: () => this.asList,
      picks: () => !this.asList || this.pick === 'one',
    },
  )

  listColumns(): readonly Column[] {
    return this.asList ? this.cards.columns() : this.columns
  }

  listCalculations(): readonly Calculation[] {
    return []
  }

  get rowsFrom(): RowsFrom {
    return this._list.rowsFrom
  }

  set rowsFrom(value: RowsFrom) {
    this._list.rowsFrom = value
  }

  set handedRows(rows: readonly HandedRow[]) {
    this._list.handedRows = rows
  }

  focusSearch(): boolean {
    return this._list.focusSearch()
  }

  setSearchText(text: string): void {
    this._list.setSearchText(text)
  }

  override render(): TemplateResult {
    if (!this.asList) return this._list.render()
    return html`<div class="list pick-${this.pick === 'none' ? 'none' : 'one'}">${this._list.render()}</div>`
  }
}

defineBlock(Table, {
  name: 'Tabelle',
  category: 'display',
  properties: tableProperties,
  capabilities: [
    { kind: 'source', helpers: 'apart' },
    { kind: 'recordChoice', gives: GIVES_CHOICE },
    { kind: 'followsSelection' },
    { kind: 'list', binding: COLUMNS_BINDING, when: AS_TABLE },
    bindable<typeof tableProperties>([...CARD_SPOTS, { ...AVATAR_SPOT, when: AS_LIST }]),
    { kind: 'events', list: [...LIST_EVENTS] },
  ],
  grid: { ...LIST_GRID, minWidth: 8, minHeight: 3, grows: AS_TABLE },
})
