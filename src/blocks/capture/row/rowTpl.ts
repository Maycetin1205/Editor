import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import type { SuggestionRow } from '../../lookup/suggestionList'
import { inputAnchorTpl } from '../../lookup/inputAnchor'
import type { Column } from '../../parts/column'
import { figureAt, greyCellTpl, type RowLayout } from '../../parts/cell'
import { cellsClass } from '../cells'
import { cellTargetOf } from './context'

interface CapturePlacement {
  columns: readonly Column[]
  slots: readonly number[]

  layout: RowLayout

  sourceId: string

  cols: Readonly<Record<string, string>>

  preview: boolean

  value: (index: number) => string

  automatic: (index: number) => boolean

  held: (index: number) => boolean

  typingColumn: number
  suggestions: readonly SuggestionRow[]
  mark: number

  typed: (index: number) => string

  windowColumns: (index: number) => readonly Column[]

  placeholder: (index: number) => string

  listToTop: boolean

  split?: { slot: number; content: TemplateResult }

  // The question before an emptied corrected row goes, above the row where
  // the list ends under it.
  asking?: { content: TemplateResult; above: boolean }
}

interface CaptureAct {
  typing: (index: number, text: string) => void
  key: (index: number, e: KeyboardEvent) => void
  leave: (index: number) => void

  chooseSuggestion: (listIndex: number) => void
  setMark: (listIndex: number) => void
}

export function captureRowTpl(placement: CapturePlacement, act: CaptureAct): TemplateResult {
  const under = placement.layout.under
  const classes = [
    'row capture',
    under.size > 0 ? 'subline' : '',
    placement.asking ? 'drop-asked' : '',
    placement.asking?.above === true ? 'ask-above' : '',
  ]
    .filter((k) => k !== '')
    .join(' ')
  return html`<div class=${classes} role="row" style=${styleMap(placement.cols)}>
    ${placement.columns.map((column, i) => captureCellTpl(placement, act, column, placement.slots[i]))}
    ${
      under.size === 0
        ? nothing
        : placement.slots.map((slot, i) => {
            const sub = under.get(slot)
            if (sub === undefined) return greyCellTpl(i, null)
            const figure = figureAt(placement.layout, sub.slot)
            if (placement.preview)
              return greyCellTpl(i, { column: sub.column, figure, content: '', typable: false }, sub.slot)
            return greyCellTpl(i, {
              column: sub.column,
              figure,
              content: captureInputTpl(placement, act, sub.column, sub.slot),
              typable: true,
              held: placement.held(sub.slot),
            })
          })
    }
    ${placement.asking?.content ?? nothing}
  </div>`
}

function captureCellTpl(placement: CapturePlacement, act: CaptureAct, column: Column, slot: number): TemplateResult {
  if (placement.preview) {
    return html`<div class=${column.hidden === true ? 'hidden' : nothing} role="cell" data-ff-place=${column.key}></div>`
  }
  const classes = [figureAt(placement.layout, slot) !== null ? 'right' : '', placement.held(slot) ? 'held' : '']
    .filter((k) => k !== '')
    .join(' ')
  return html`<div class=${classes === '' ? nothing : classes} role="cell">${captureInputTpl(
    placement,
    act,
    column,
    slot,
  )}</div>`
}

function captureInputTpl(placement: CapturePlacement, act: CaptureAct, column: Column, slot: number): TemplateResult {
  const free = cellTargetOf(column, placement.sourceId).kind === 'free'
  const list = !free && placement.typingColumn === slot
  const value = placement.value(slot)

  return html`${inputAnchorTpl(
    {
      value,
      title: column.title,
      placeholder: placement.placeholder(slot),
      inputClass: cellsClass(placement.automatic(slot) ? 'automatic' : 'quiet'),
      holderClass: 'cell-holder',
      marksOnEntering: true,
      keepsTyping: true,
      slot,
      suggestions: list ? placement.suggestions : [],
      columns: list ? placement.windowColumns(slot) : [],
      typed: placement.typed(slot),
      mark: placement.mark,
      listToTop: placement.listToTop,
      ...(placement.split?.slot === slot ? { beside: placement.split.content } : {}),
    },
    {
      typing: (text) => act.typing(slot, text),
      key: (e) => act.key(slot, e),
      leave: () => act.leave(slot),
      chooseSuggestion: (i2) => act.chooseSuggestion(i2),
      setMark: (i2) => act.setMark(i2),
    },
  )}`
}
