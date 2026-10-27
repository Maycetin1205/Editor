import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable } from '../../core/block/capability'
import type { Calculation } from '../../core/data/calculation'
import { makeFieldReader } from '../../runtime/foreignSources'
import { spotValue } from '../../runtime/source'
import { AVATAR_SPOT, avatarStyle, cardOf, cardSpotStyle, type CardValues } from '../parts/card'
import type { Column } from '../parts/column'
import { LIST_EVENTS, RecordList, tableStyle, WITHOUT_DECORATION, type RowsBelow } from '../list'
import { TABLE_PART } from '../list/parts'
import { dataListStyle } from './dataListStyle'
import { dataListProperties, PICK_ONE, ROW_SPOTS, type DataListValues } from './properties'

const CARD_SPOTS = [...ROW_SPOTS, AVATAR_SPOT]

export interface DataList extends DataListValues {}

// The table drawn as a plain list: no head, no foot, one column whose cell
// is the card of a record (avatar, title, the line under it, the value on
// the right). Rows, choice, keys and loading are the table's.
export class DataList extends BlockElement {
  static readonly type = 'datalist'
  static readonly tag = 'ff-datalist'

  static override styles: CSSResultGroup = [BlockElement.styles, tableStyle, avatarStyle, cardSpotStyle, dataListStyle]

  static override busyLine = true

  @property({ attribute: false }) dataRows: string[][] = []

  @property({ attribute: false }) rawRows: unknown[] = []

  // How many rows the list holds, for an area that counts them in its head.
  get rowCount(): number {
    return this.rawRows.length
  }

  readonly search = false
  readonly paging = false
  readonly sortByClick = false
  readonly columnPicker = false
  readonly dayField = ''

  private _column: { field: string; columns: readonly Column[] } = { field: '', columns: [] }

  private _cards: { rows: readonly unknown[]; values: Map<number, Record<string, string>> } = {
    rows: [],
    values: new Map(),
  }

  private readonly _list = new RecordList(
    this,
    {
      cellValue: (rawIndex) => this.cardAt(rawIndex).heading ?? '',
      decoration: () => (rawIndex) => ({ ...WITHOUT_DECORATION, cell: () => this.cardTpl(this.cardAt(rawIndex)) }),
      required: () => false,
      held: () => false,
      greyLine: () => new Map(),
      bottom: () => (this.preview ? this.sampleRow() : null),
    },
    { plain: true, picks: () => this.pick === 'one' },
  )

  // The one column, bound to the first bound spot: without one the list has
  // nothing to show, as a table without a bound column.
  get columns(): readonly Column[] {
    const field = CARD_SPOTS.map(({ prop }) => this[`${prop}Field`]).find((f) => f !== '') ?? ''
    if (this._column.columns.length === 0 || this._column.field !== field) {
      this._column = { field, columns: [{ key: 'card', title: '', field }] }
    }
    return this._column.columns
  }

  listColumns(): readonly Column[] {
    return this.columns
  }

  listCalculations(): readonly Calculation[] {
    return []
  }

  private cardAt(rawIndex: number): Record<string, string> {
    if (this._cards.rows !== this.rawRows) this._cards = { rows: this.rawRows, values: new Map() }
    const known = this._cards.values.get(rawIndex)
    if (known) return known
    const row = this.rawRows[rawIndex]
    const read = makeFieldReader(this)
    const values = Object.fromEntries(
      CARD_SPOTS.map(({ prop }) => [prop, spotValue('', this[`${prop}Field`], row, read)]),
    )
    this._cards.values.set(rawIndex, values)
    return values
  }

  private cardTpl(values: CardValues): TemplateResult {
    const { shows, spot, avatar } = cardOf(this, ROW_SPOTS, (prop) => this[`${prop}Field`], this.reportSpot, values)
    return html`${avatar()}
      <span class="ident">
        ${shows('heading') ? spot('heading', 'name') : nothing}
        ${shows('subline') ? spot('subline', 'meta') : nothing}
      </span>
      ${shows('aside') ? spot('aside', 'aside') : nothing}`
  }

  // In the editor one row with the names of the spots, to bind them.
  private sampleRow(): RowsBelow {
    return {
      count: 1,
      render: ({ cols }) =>
        html`<div class=${TABLE_PART.row} role="row" style=${styleMap(cols)}><div role="cell">${this.cardTpl(
          null,
        )}</div></div>`,
    }
  }

  override render(): TemplateResult {
    return html`<div class="list pick-${this.pick}">${this._list.render()}</div>`
  }
}

defineBlock(DataList, {
  name: 'Datenliste',
  category: 'display',
  properties: dataListProperties,
  capabilities: [
    { kind: 'source' },
    { kind: 'recordChoice', gives: PICK_ONE },
    { kind: 'followsSelection' },
    bindable<typeof dataListProperties>([...ROW_SPOTS, AVATAR_SPOT]),
    { kind: 'events', list: [...LIST_EVENTS] },
  ],
  grid: { startWidth: 24, startHeight: 10, minWidth: 8, minHeight: 3 },
})
