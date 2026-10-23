import { html, nothing, type TemplateResult } from 'lit'
import type { Column, ColumnView, Figure } from './column'

export interface RowLayout {
  main: ColumnView

  under: ReadonlyMap<number, { column: Column; slot: number }>

  figures: readonly (Figure | null)[]
}

export function figureAt(layout: RowLayout, slot: number): Figure | null {
  return layout.figures[slot] ?? null
}

export function walkOrder(layout: RowLayout): number[] {
  const grey = layout.main.slots.flatMap((slot) => {
    const sub = layout.under.get(slot)
    return sub === undefined ? [] : [sub.slot]
  })
  return [...layout.main.slots, ...grey]
}

export function cellBelow(layout: RowLayout, slot: number): number {
  return layout.under.get(slot)?.slot ?? -1
}

export function cellAbove(layout: RowLayout, slot: number): number {
  return [...layout.under].find(([, sub]) => sub.slot === slot)?.[0] ?? -1
}

export function stripeOf(layout: RowLayout, slot: number): number[] {
  const above = cellAbove(layout, slot)
  const top = above === -1 ? slot : above
  const below = cellBelow(layout, top)
  return below === -1 ? [top] : [top, below]
}

export interface GreyPart {
  column: Column

  figure: Figure | null

  content: TemplateResult | string

  typable: boolean

  held?: boolean
}

export function greyCellTpl(at: number, part: GreyPart | null, spot?: number): TemplateResult {
  const classes = [
    'sub',
    part !== null && part.figure !== null ? 'right' : '',
    part?.column.hidden === true ? 'hidden' : '',
    part?.typable === true ? 'typable' : '',
    part?.held === true ? 'held' : '',
  ]
    .filter((k) => k !== '')
    .join(' ')
  return html`<div
    class=${classes}
    role="cell"
    style="grid-column: ${at + 1}"
    data-ff-entry=${spot ?? nothing}
    data-ff-below=${spot === undefined ? nothing : ''}
    data-ff-editable=${spot === undefined ? nothing : ''}
  >${
    part === null
      ? nothing
      : html`<span class="head-text">${part.column.title}</span>${
          part.typable
            ? part.content
            : part.content === ''
              ? nothing
              : html`<span class="sub-value">${part.content}</span>`
        }`
  }</div>`
}
