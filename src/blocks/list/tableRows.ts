import { html, nothing, type TemplateResult } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import { styleMap } from 'lit/directives/style-map.js'
import { markHit } from '../parts/cellSearch'
import { shownValue, type Column } from '../parts/column'
import type { ColumnsGrid } from './columnWidth'
import { TABLE_PART } from './parts'
import { figureAt, greyCellTpl, type GreyPart, type RowLayout } from '../parts/cell'
import type { RowDecoration } from './listHooks'
import { rowClicked, rowDoubleClicked, rowKeyDown } from './rowInput'

export interface RowsPlacement {
  columns: readonly Column[]

  slots: readonly number[]

  cols: ColumnsGrid

  layout: RowLayout

  selectionSemantics: boolean

  searchText: string

  rows: readonly number[]

  keyOf: (rawIndex: number) => string

  valueAt: (rawIndex: number, slot: number) => string

  rulerTicks: number | null

  showsRows: boolean
  // Whether a click or Enter picks a row.
  picks: boolean
  chosenIndex: number

  decoration: (rawIndex: number) => RowDecoration
}

export interface RowsAct {
  activateRow: (rawIndex: number, viewIndex: number) => void

  rowDouble: (rawIndex: number) => void
}

interface CellPart {
  value: string

  content: TemplateResult | string

  typable: boolean
}

function partOf(
  placement: RowsPlacement,
  decoration: RowDecoration,
  rawIndex: number,
  column: Column,
  slot: number,
): CellPart {
  const value = placement.valueAt(rawIndex, slot)
  const own = decoration.cell(slot, column, value)
  const shown = shownValue(figureAt(placement.layout, slot), value)
  return {
    value,
    content: own ?? markHit(shown, placement.searchText),
    typable: own !== null,
  }
}

function cellTpl(
  placement: RowsPlacement,
  decoration: RowDecoration,
  rawIndex: number,
  s: Column,
  slot: number,
): TemplateResult {
  const main = partOf(placement, decoration, rawIndex, s, slot)
  const classes = [
    s.hidden === true ? TABLE_PART.hidden : '',
    figureAt(placement.layout, slot) !== null ? TABLE_PART.right : '',
    main.typable ? TABLE_PART.typable : '',
  ]
    .filter((k) => k !== '')
    .join(' ')
  return html`<div class=${classes === '' ? nothing : classes} role="cell">${main.content}</div>`
}

function greyParts(placement: RowsPlacement, decoration: RowDecoration, rawIndex: number): (GreyPart | null)[] | null {
  if (placement.layout.under.size === 0) return null
  const parts = placement.slots.map((slot): GreyPart | null => {
    const sub = placement.layout.under.get(slot)
    if (sub === undefined) return null
    const part = partOf(placement, decoration, rawIndex, sub.column, sub.slot)
    const figure = figureAt(placement.layout, sub.slot)
    return part.typable || part.value !== ''
      ? { column: sub.column, figure, content: part.content, typable: part.typable }
      : null
  })
  return parts.some((part) => part !== null) ? parts : null
}

function rowClass(placement: RowsPlacement, rawIndex: number, grey: boolean, decoration: RowDecoration): string {
  return [
    TABLE_PART.row,
    placement.showsRows && placement.picks ? 'selectable' : '',
    rawIndex === placement.chosenIndex ? TABLE_PART.chosen : '',
    grey ? TABLE_PART.subline : '',
    decoration.className,
  ]
    .filter((k) => k !== '')
    .join(' ')
}

function rowTpl(placement: RowsPlacement, act: RowsAct, rawIndex: number, viewIndex: number): TemplateResult {
  const decoration = placement.decoration(rawIndex)
  const grey = greyParts(placement, decoration, rawIndex)
  const activate = (): void => act.activateRow(rawIndex, viewIndex)
  return html`<div
    class=${rowClass(placement, rawIndex, grey !== null, decoration)}
    role="row"
    data-status=${decoration.status === '' ? nothing : decoration.status}
    data-ff-row=${placement.keyOf(rawIndex)}
    tabindex="0"
    aria-selected=${placement.selectionSemantics ? String(rawIndex === placement.chosenIndex) : nothing}
    style=${styleMap(placement.cols)}
    @click=${(e: MouseEvent) => rowClicked(e, rawIndex === placement.chosenIndex, activate)}
    @dblclick=${(e: MouseEvent) => rowDoubleClicked(e, () => act.rowDouble(rawIndex))}
    @keydown=${(e: KeyboardEvent) => rowKeyDown(e, decoration, activate)}
  >
    ${placement.columns.map((s, i) => cellTpl(placement, decoration, rawIndex, s, placement.slots[i]))}
    ${grey === null ? nothing : grey.map((part, i) => greyCellTpl(i, part))}
    ${decoration.right}
  </div>`
}

export function tableRows(placement: RowsPlacement, act: RowsAct): ReturnType<typeof repeat> {
  return repeat(
    placement.rows,
    (rawIndex) => placement.keyOf(rawIndex),
    (rawIndex, viewIndex) => rowTpl(placement, act, rawIndex, viewIndex),
  )
}

// Empty lines under the records, down to the foot.
export function tableRuler(placement: RowsPlacement): TemplateResult {
  const ticks = placement.rulerTicks ?? 0
  return html`<div class=${TABLE_PART.ruler} role="presentation">${Array.from(
    { length: ticks },
    () => html`<div
    class=${TABLE_PART.row}
    role="presentation"
    style=${styleMap(placement.cols)}
  >${placement.columns.map(() => html`<div role="cell"></div>`)}</div>`,
  )}</div>`
}
