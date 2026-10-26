import { html, nothing, type TemplateResult } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import { styleMap } from 'lit/directives/style-map.js'
import { markHit } from '../parts/cellSearch'
import { shownValue, type Column } from '../parts/column'
import type { ColumnsGrid } from './columnWidth'
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
  selectionIndex: number

  decoration: (rawIndex: number | null) => RowDecoration
}

export interface RowsAct {
  activateRow: (rawIndex: number | null, viewIndex: number) => void

  rowDouble: (rawIndex: number | null) => void
}

interface CellPart {
  value: string

  content: TemplateResult | string

  typable: boolean
}

function partOf(
  placement: RowsPlacement,
  decoration: RowDecoration,
  rawIndex: number | null,
  column: Column,
  slot: number,
): CellPart {
  const value = rawIndex !== null ? placement.valueAt(rawIndex, slot) : ''
  const own = rawIndex === null ? null : decoration.cell(slot, column, value)
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
  rawIndex: number | null,
  s: Column,
  slot: number,
): TemplateResult {
  const main = partOf(placement, decoration, rawIndex, s, slot)
  const classes = [
    s.hidden === true ? 'hidden' : '',
    figureAt(placement.layout, slot) !== null ? 'right' : '',
    main.typable ? 'typable' : '',
  ]
    .filter((k) => k !== '')
    .join(' ')
  return html`<div class=${classes === '' ? nothing : classes} role="cell">${main.content}</div>`
}

function greyParts(
  placement: RowsPlacement,
  decoration: RowDecoration,
  rawIndex: number | null,
): (GreyPart | null)[] | null {
  if (rawIndex === null || placement.layout.under.size === 0) return null
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

function rowTpl(placement: RowsPlacement, act: RowsAct, rawIndex: number | null, viewIndex: number): TemplateResult {
  const activatable = rawIndex !== null
  const decoration = placement.decoration(rawIndex)
  const grey = greyParts(placement, decoration, rawIndex)
  const activate = (): void => act.activateRow(rawIndex, viewIndex)
  return html`<div
    class="row${rawIndex !== null && placement.showsRows ? ' selectable' : ''}${
      rawIndex !== null && rawIndex === placement.selectionIndex ? ' selected' : ''
    }${grey !== null ? ' subline' : ''}${decoration.className === '' ? '' : ' ' + decoration.className}"
    role="row"
    data-status=${decoration.status === '' ? nothing : decoration.status}
    data-ff-row=${rawIndex === null ? nothing : placement.keyOf(rawIndex)}
    tabindex=${activatable ? '0' : nothing}
    aria-selected=${
      placement.selectionSemantics && rawIndex !== null ? String(rawIndex === placement.selectionIndex) : nothing
    }
    style=${styleMap(placement.cols)}
    @click=${(e: MouseEvent) => rowClicked(e, rawIndex !== null && rawIndex === placement.selectionIndex, activate)}
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
  return html`<div class="ruler" role="presentation">${Array.from(
    { length: ticks },
    () => html`<div
    class="row"
    role="presentation"
    style=${styleMap(placement.cols)}
  >${placement.columns.map(() => html`<div role="cell"></div>`)}</div>`,
  )}</div>`
}
