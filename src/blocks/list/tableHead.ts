import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import type { Column } from '../parts/column'
import { figureAt, type RowLayout } from '../parts/cell'
import { widthsHandles, type ColumnsGrid, type WidthsHost } from './columnWidth'
import { TABLE_PART } from './parts'

export interface HeadPlacement {
  columns: readonly Column[]

  slots: readonly number[]

  cols: ColumnsGrid

  layout: RowLayout

  editable: boolean

  preview: boolean

  columnPickerOn: boolean

  sortColumn: number
  sortAscending: boolean

  required: (slot: number) => boolean

  held: (slot: number) => boolean
}

export interface HeadAct {
  widths: WidthsHost

  clickHead: (index: number) => void

  openColumnPicker: (e: MouseEvent) => void
}

function headCellTpl(placement: HeadPlacement, act: HeadAct, s: Column, slot: number, i: number): TemplateResult {
  return html`<div
    class=${
      [
        s.hidden === true ? TABLE_PART.hidden : '',
        figureAt(placement.layout, slot) !== null ? TABLE_PART.right : '',
        placement.held(slot) ? TABLE_PART.held : '',
      ]
        .filter((k) => k !== '')
        .join(' ') || nothing
    }
    role="columnheader"
    data-ff-editable
    data-ff-entry=${placement.preview ? slot : nothing}
    style="grid-row: 1; grid-column: ${i + 1}"
    @click=${() => act.clickHead(slot)}
    @contextmenu=${placement.columnPickerOn ? (e: MouseEvent) => act.openColumnPicker(e) : nothing}
  ><span class=${TABLE_PART.headText}>${s.title}</span>${placement.required(slot) ? html`<em class="required">*</em>` : nothing}${
    !placement.editable && placement.sortColumn === slot
      ? html`<span class="sort-arrow">${placement.sortAscending ? ' ▲' : ' ▼'}</span>`
      : ''
  }</div>`
}

export function tableHead(placement: HeadPlacement, act: HeadAct): TemplateResult {
  return html`<div class=${TABLE_PART.head} role="row" style=${styleMap(placement.cols)}>
        ${placement.columns.map((s, i) => headCellTpl(placement, act, s, placement.slots[i], i))}
        ${widthsHandles(placement.columns.length, act.widths)}
      </div>`
}
