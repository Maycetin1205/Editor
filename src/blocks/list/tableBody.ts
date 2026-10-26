import { html, nothing, type TemplateResult } from 'lit'
import { columnsChoiceTpl, type ColumnsChoiceAct, type ColumnsChoicePlacement } from './columnPicker'
import { TABLE_PART } from './parts'
import { tableHead, type HeadAct, type HeadPlacement } from './tableHead'
import { tableRows, tableRuler, type RowsAct, type RowsPlacement } from './tableRows'
import { tableSearch } from './tableSearch'

export interface BodyPlacement extends HeadPlacement, RowsPlacement {
  columnPicker: ColumnsChoicePlacement | null

  showSearch: boolean

  bottom: TemplateResult | typeof nothing
}

export interface BodyAct extends HeadAct, RowsAct {
  setSearchText: (text: string) => void

  columnPicker: ColumnsChoiceAct
}

// Everything above the foot: the search line, the scrolling body with the head,
// the records, the rows a block adds below them and the empty ruler lines, and
// the column picker over it all.
export function tableBody(placement: BodyPlacement, act: BodyAct): TemplateResult {
  return html`
      ${tableSearch(placement, act)}
      <div class=${TABLE_PART.body} role="table" tabindex="-1">
      ${tableHead(placement, act)}
        ${tableRows(placement, act)}
        ${placement.bottom}
        ${tableRuler(placement)}
      </div>
      ${columnsChoiceTpl(placement.columnPicker, act.columnPicker)}
    `
}
