import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { makeFieldReader } from '../../runtime/foreignSources'
import { spotValue } from '../../runtime/source'
import type { BlockElement } from '../base/BlockElement'
import { AVATAR_SPOT, cardOf, type CardValues } from '../parts/card'
import type { Column } from '../parts/column'
import { WITHOUT_DECORATION, type RowDecoration, type RowsBelow } from '../list'
import { TABLE_PART } from '../list/parts'
import { CARD_SPOTS } from './properties'

// The rows of a table drawn as a list: each row is the card of its record,
// with its avatar, title, the line under it and the value on the right. The
// list has one column, bound to the first bound place of the card; without
// one it has nothing to show, as a table without a bound column.

const SPOTS = [...CARD_SPOTS, AVATAR_SPOT]

type SpotProp = (typeof SPOTS)[number]['prop']

interface CardTable extends BlockElement {
  readonly rawRows: readonly unknown[]
  readonly headingField: string
  readonly sublineField: string
  readonly asideField: string
  readonly avatarField: string
}

export class CardRows {
  private readonly table: CardTable

  private readonly report: (event: MouseEvent) => void

  private column: { field: string; columns: readonly Column[] } = { field: '', columns: [] }

  private cards: { rows: readonly unknown[]; values: Map<number, Record<string, string>> } = {
    rows: [],
    values: new Map(),
  }

  constructor(table: CardTable, report: (event: MouseEvent) => void) {
    this.table = table
    this.report = report
  }

  private fieldOf(prop: SpotProp): string {
    return this.table[`${prop}Field`]
  }

  columns(): readonly Column[] {
    const field = SPOTS.map(({ prop }) => this.fieldOf(prop)).find((f) => f !== '') ?? ''
    if (this.column.columns.length === 0 || this.column.field !== field) {
      this.column = { field, columns: [{ key: 'card', title: '', field }] }
    }
    return this.column.columns
  }

  heading(rawIndex: number): string {
    return this.cardAt(rawIndex).heading ?? ''
  }

  readonly decoration = (rawIndex: number): RowDecoration => ({
    ...WITHOUT_DECORATION,
    cell: () => this.cardTpl(this.cardAt(rawIndex)),
  })

  // In the editor one row with the names of the places, to bind them.
  sampleRow(): RowsBelow {
    return {
      count: 1,
      render: ({ cols }) =>
        html`<div class=${TABLE_PART.row} role="row" style=${styleMap(cols)}><div role="cell">${this.cardTpl(
          null,
        )}</div></div>`,
    }
  }

  private cardAt(rawIndex: number): Record<string, string> {
    const rows = this.table.rawRows
    if (this.cards.rows !== rows) this.cards = { rows, values: new Map() }
    const known = this.cards.values.get(rawIndex)
    if (known) return known
    const row = rows[rawIndex]
    const read = makeFieldReader(this.table)
    const values = Object.fromEntries(SPOTS.map(({ prop }) => [prop, spotValue('', this.fieldOf(prop), row, read)]))
    this.cards.values.set(rawIndex, values)
    return values
  }

  private cardTpl(values: CardValues): TemplateResult {
    const { shows, spot, avatar } = cardOf(this.table, CARD_SPOTS, (prop) => this.fieldOf(prop), this.report, values)
    return html`${avatar()}
      <span class="ident">
        ${shows('heading') ? spot('heading', 'name') : nothing}
        ${shows('subline') ? spot('subline', 'meta') : nothing}
      </span>
      ${shows('aside') ? spot('aside', 'aside') : nothing}`
  }
}
