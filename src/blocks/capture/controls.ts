import type { TemplateResult } from 'lit'
import { readDeclared } from '../../core/block/registry'
import { openLookup } from '../lookup/lookup'
import { keyOf } from '../lookup/suggestionState'
import type { ColumnView } from '../parts/column'
import type { RowLayout } from '../parts/cell'
import type { CaptureColumn } from './column'
import type { CaptureLedger } from './ledger'
import { giveUp } from './ledger/capturing'
import { enterFrom, jumpFrom, moveDown, moveUp } from './ledger/moves'
import { keyIntent } from './keys'
import { captureProperties } from './properties'
import { rowView, waitingSources } from './row/cellValues'
import { adopt } from './row/linkedRecords'
import { lookupAt, windowColumnsAt } from './row/lookupSpot'
import { captureRowTpl } from './row/rowTpl'
import { adoptSuggestion, decideKey, setMark } from './row/suggestions'
import { emptyCell, leaveCell, neighbour, typeCell } from './row/typing'
import { splitFor } from './splitControls'
import { dropAskTpl } from './dropAsk'

import '../table/Table'

// The typing row on the page: what it shows, and what typing, its keys and
// its lookup window do. The jobs themselves live in row/ and ledger/.

interface CaptureRowPlacement {
  ledger: CaptureLedger

  block: HTMLElement

  preview: boolean

  sourceId: string

  dropAskAbove: boolean
}

function openWindow(placement: CaptureRowPlacement, index: number): void {
  const ledger = placement.ledger
  const spot = lookupAt(ledger.row, index)
  if (spot === null) return
  openLookup({
    el: placement.block,
    spot: spot.spot,
    sourceId: spot.sourceId,
    storageField: spot.field,
    storageTitle: spot.title,
    columns: spot.columns,
    title: spot.title,
    width: spot.width,
    height: spot.height,
    entries: spot.entries,

    backFocus: () => ledger.host.focusCell(index),
    searchText: spot.searchText,
    onAdopt: (_display, _value, record) => {
      adopt(ledger.row, index, record)
      enterFrom(ledger, index)
    },
  })
}

function enter(placement: CaptureRowPlacement, index: number): void {
  if (enterFrom(placement.ledger, index) === 'window') openWindow(placement, index)
}

// What a key in a cell does, as the suggestion list and the cell decide it.
// keep is false where the key did nothing in the row; the browser then has it.
function key(placement: CaptureRowPlacement, index: number, e: KeyboardEvent): void {
  const ledger = placement.ledger
  const row = ledger.row
  const intent = keyIntent(e)
  if (intent === 'lookup') e.preventDefault()

  if (intent === 'backTab') {
    const previous = neighbour(row, index, -1)
    if (previous === -1) return
    e.preventDefault()
    ledger.host.focusCell(previous)
    return
  }
  // The suggestion list speaks the key names of the lookup, where Alt+Down is F5.
  let action = decideKey(row, index, keyOf(e))
  if (action === 'clear' && ledger.captured.correctionSlot !== null) action = 'giveUp'
  if (action === 'nothing') {
    if (intent === 'enter') e.preventDefault()
    return
  }
  let keep = true
  if (action === 'adopt') {
    adoptSuggestion(row, index, row.suggestions.mark)
    if (intent === 'tab') keep = jumpFrom(ledger, index)
    else enter(placement, index)
  } else if (action === 'window') openWindow(placement, index)
  else if (action === 'further') {
    if (intent === 'enter') enter(placement, index)
    else keep = jumpFrom(ledger, index)
  } else if (action === 'down') keep = moveDown(ledger, index)
  else if (action === 'up') keep = moveUp(ledger, index)
  else if (action === 'clear') emptyCell(row, index)
  else if (action === 'giveUp') keep = giveUp(ledger)
  if (keep) e.preventDefault()
}

// The faint words in an empty cell: a linked source still loading, the title
// of a required column, else the hint of the capture in the first free cell.
function placeholders(
  block: HTMLElement,
  view: ColumnView,
  waiting: ReadonlyMap<number, string>,
): (slot: number) => string {
  const hint = readDeclared(block, captureProperties.rowHint) ?? ''
  const required = (i: number): boolean => (view.columns[i] as CaptureColumn).required === true
  const hintAt = view.slots.find((_, i) => !required(i))
  return (slot) => {
    const source = waiting.get(slot)
    if (source !== undefined) return `${source} lädt…`
    const i = view.slots.indexOf(slot)
    if (i !== -1 && required(i)) return view.columns[i].title
    return slot === hintAt ? hint : ''
  }
}

export function captureRowFor(
  placement: CaptureRowPlacement,
  view: ColumnView,
  cols: Readonly<Record<string, string>>,
  layout: RowLayout,
  listToTop: boolean,
): TemplateResult {
  const row = placement.ledger.row
  const cells = rowView(row)
  return captureRowTpl(
    {
      columns: view.columns,
      slots: view.slots,
      layout,
      sourceId: placement.sourceId,
      cols,
      preview: placement.preview,
      value: (i) => cells[i]?.value ?? '',
      automatic: (i) => cells[i]?.automatic === true,
      held: (i) => cells[i]?.held === true,
      typingColumn: row.cells.cursor,
      suggestions: row.suggestions.hit,
      mark: row.suggestions.mark,
      typed: (i) => row.cells.typed.get(i) ?? '',
      windowColumns: (i) => windowColumnsAt(row, i),
      placeholder: placement.preview ? () => '' : placeholders(placement.block, view, waitingSources(row)),
      listToTop,
      split: splitFor(placement.ledger, view, placement.preview),
      ...(placement.ledger.captured.dropAsked
        ? { asking: { content: dropAskTpl(placement.ledger), above: placement.dropAskAbove } }
        : {}),
    },
    {
      typing: (i, text) => typeCell(row, i, text),
      key: (i, e) => key(placement, i, e),
      leave: (i) => leaveCell(row, i),
      chooseSuggestion: (listIndex) => adoptSuggestion(row, row.cells.cursor, listIndex),
      setMark: (listIndex) => setMark(row, listIndex),
    },
  )
}
