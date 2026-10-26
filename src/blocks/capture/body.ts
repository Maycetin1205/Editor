import { html, nothing, type TemplateResult } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import { styleMap } from 'lit/directives/style-map.js'
import { inputSpotTpl } from '../lookup/inputSpot'
import { cellsClass } from './cells'
import { columnEditable } from './column'
import { shownValue, type Column } from '../parts/column'
import { figureAt, greyCellTpl, type GreyPart, type RowLayout } from '../parts/cell'
import { WITHOUT_DECORATION, type RowDecoration } from '../list'
import type { CaptureLedger } from './ledger'
import type { RowState } from './ledger/outbound'

function typingCellTpl(ledger: CaptureLedger, rawIndex: number, slot: number, column: Column): TemplateResult {
  const booked = ledger.booked
  return inputSpotTpl(
    {
      value: booked.cellValue(rawIndex, slot),
      title: column.title,
      placeholder: '',
      inputClass: cellsClass(booked.isChanged(rawIndex, slot) ? 'changed' : 'quiet'),
      holderClass: 'cell-holder',
      marksOnEntering: true,
      keepsTyping: true,
      slot,
      suggestions: [],
      columns: [],
      typed: '',
      mark: 0,
    },
    {
      typing: (text) => booked.typeCell(rawIndex, slot, text),
      key: (e) => booked.keyCell(rawIndex, slot, e),
      leave: (text) => booked.leaveCell(rawIndex, slot, text),
      chooseSuggestion: () => {},
      setMark: () => {},
    },
  )
}

interface CapturedPlacement {
  slots: readonly number[]

  cols: Readonly<Record<string, string>>

  layout: RowLayout

  captured: readonly (readonly string[])[]

  keyAt: (index: number) => string

  capturedState: (index: number) => RowState

  chosen: (index: number) => boolean

  correctionSlot: number | null

  capture: TemplateResult
}

interface CapturedAct {
  takeCapturedRow: (index: number) => void

  bringBackCapturedRow: (index: number) => void

  chooseCapturedRow: (index: number) => void
}

function greyParts(layout: RowLayout, slots: readonly number[], values: readonly string[]): (GreyPart | null)[] | null {
  const parts = slots.map((slot): GreyPart | null => {
    const sub = layout.under.get(slot)
    const value = sub === undefined ? '' : (values[sub.slot] ?? '')
    if (sub === undefined || value === '') return null
    const figure = figureAt(layout, sub.slot)
    return { column: sub.column, figure, content: shownValue(figure, value), typable: false }
  })
  return parts.some((part) => part !== null) ? parts : null
}

const TYPING = -1

function capturedRowTpl(placement: CapturedPlacement, act: CapturedAct, rowsIndex: number): TemplateResult {
  const values = placement.captured[rowsIndex] ?? []
  const state = placement.capturedState(rowsIndex)

  const fixed = state.status === 'written' || state.status === 'writes'
  const grey = greyParts(placement.layout, placement.slots, values)
  const cell = (slot: number): TemplateResult => {
    const figure = figureAt(placement.layout, slot)
    return html`<div class=${figure !== null ? 'right' : nothing} role="cell">${shownValue(figure, values[slot] ?? '')}</div>`
  }
  return html`<div
    class="row captured${grey !== null ? ' subline' : ''}${placement.chosen(rowsIndex) ? ' selected' : ''}"
    role="row"
    data-ff-leads-to-typing
    data-status=${state.status}
    style=${styleMap(placement.cols)}
    @click=${() => act.chooseCapturedRow(rowsIndex)}
    @dblclick=${fixed ? nothing : () => act.bringBackCapturedRow(rowsIndex)}
  >
    ${placement.slots.map((slot) => cell(slot))}
    ${grey === null ? nothing : grey.map((part, i) => greyCellTpl(i, part))}
    <button
      class="row-remove"
      type="button"
      title=${fixed ? 'Aus der Ansicht nehmen' : 'Diese erfasste Zeile wieder wegnehmen'}
      aria-label="Erfasste Zeile wegnehmen"
      @click=${(e: MouseEvent) => {
        e.stopPropagation()
        act.takeCapturedRow(rowsIndex)
      }}
    >&#x2715;</button>
  </div>`
}

export function capturedRowsTpl(placement: CapturedPlacement, act: CapturedAct): TemplateResult {
  const lines = placement.captured.map((_, rowsIndex) => rowsIndex)
  const typingAt = placement.correctionSlot === null ? lines.length : Math.min(placement.correctionSlot, lines.length)
  lines.splice(typingAt, 0, TYPING)
  return html`${repeat(
    lines,
    (rowsIndex) => (rowsIndex === TYPING ? 'typing' : placement.keyAt(rowsIndex)),
    (rowsIndex) => (rowsIndex === TYPING ? placement.capture : capturedRowTpl(placement, act, rowsIndex)),
  )}`
}

interface DecorationPlacement {
  typable: boolean

  ledger: CaptureLedger
}

export function captureDecoration(placement: DecorationPlacement): (rawIndex: number | null) => RowDecoration {
  return (rawIndex) => {
    if (rawIndex === null) return WITHOUT_DECORATION
    const state = placement.ledger.booked.statusOf(rawIndex)
    return {
      ...WITHOUT_DECORATION,
      status: state.status === 'booked' ? '' : state.status,
      cell: (slot, column) =>
        placement.typable && columnEditable(column) ? typingCellTpl(placement.ledger, rawIndex, slot, column) : null,
    }
  }
}
