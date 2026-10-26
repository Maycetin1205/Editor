import type { TemplateResult } from 'lit'
import { readDeclared } from '../../core/block/registry'
import { openLookup } from '../lookup/lookup'
import { keyOf } from '../lookup/suggestionState'
import type { ColumnView } from '../parts/column'
import type { RowLayout } from '../parts/cell'
import type { CaptureColumn } from './column'
import type { CaptureLedger } from './ledger'
import { keyIntent } from './keys'
import { captureProperties } from './properties'
import { captureRowTpl } from './row'
import { splitListTpl } from './split/splitList'

import '../table/Table'

interface CaptureRowPlacement {
  ledger: CaptureLedger

  block: HTMLElement

  preview: boolean

  sourceId: string
}

function openWindow(placement: CaptureRowPlacement, index: number): void {
  const spot = placement.ledger.lookupAt(index)
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

    backFocus: () => placement.ledger.focusCell(index),
    searchText: spot.searchText,
    onAdopt: (_display, _value, record) => {
      placement.ledger.adopt(index, record)
      placement.ledger.enter(index)
    },
  })
}

function enter(placement: CaptureRowPlacement, index: number): void {
  if (placement.ledger.enter(index) === 'window') openWindow(placement, index)
}

function key(placement: CaptureRowPlacement, index: number, e: KeyboardEvent): void {
  const ledger = placement.ledger
  const intent = keyIntent(e)
  if (intent === 'lookup') e.preventDefault()

  if (intent === 'backTab') {
    const previous = ledger.neighbour(index, -1)
    if (previous === -1) return
    e.preventDefault()
    ledger.focusCell(previous)
    return
  }
  // The suggestion list speaks the key names of the lookup, where Alt+Down is F5.
  let action = ledger.decideKey(index, keyOf(e))
  if (action === 'clear' && ledger.correctionSlot !== null) action = 'giveUp'
  if (action === 'nothing') {
    if (intent === 'enter') e.preventDefault()
    return
  }
  let keep = true
  if (action === 'adopt') {
    ledger.adoptSuggestion(index, ledger.mark)
    if (intent === 'tab') keep = ledger.jumpFrom(index)
    else enter(placement, index)
  } else if (action === 'window') openWindow(placement, index)
  else if (action === 'further') {
    if (intent === 'enter') enter(placement, index)
    else keep = ledger.jumpFrom(index)
  } else if (action === 'down') keep = ledger.down(index)
  else if (action === 'up') keep = ledger.up(index)
  else if (action === 'clear') ledger.empty(index)
  else if (action === 'giveUp') keep = ledger.giveUp()
  if (keep) e.preventDefault()
}

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

function splitFor(
  placement: CaptureRowPlacement,
  view: ColumnView,
): { slot: number; content: TemplateResult } | undefined {
  const ledger = placement.ledger
  if (placement.preview || !ledger.split.open) return undefined
  const anchor = ledger.splitAnchor()
  const slot = view.slots.includes(anchor) ? anchor : view.slots[view.slots.length - 1]
  if (slot === undefined) return undefined
  const title = anchor === -1 ? '' : (view.columns[view.slots.indexOf(anchor)]?.title ?? '')
  const content = splitListTpl(ledger.split, title, {
    key: (e) => ledger.splitKey(e),
    toggle: (i) => ledger.splitToggle(i),
    mark: (i) => ledger.splitMark(i),
    amount: (i) => ledger.splitAmount(i),
    leave: (e) => ledger.splitLeave(e),
  })
  return typeof content === 'symbol' ? undefined : { slot, content }
}

export function captureRowFor(
  placement: CaptureRowPlacement,
  view: ColumnView,
  cols: Readonly<Record<string, string>>,
  layout: RowLayout,
  listToTop: boolean,
): TemplateResult {
  const ledger = placement.ledger
  const cells = ledger.rowView()
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
      typingColumn: ledger.typingColumn,
      suggestions: ledger.suggestions,
      mark: ledger.mark,
      typed: (i) => ledger.typedAt(i),
      windowColumns: (i) => ledger.windowColumnsAt(i),
      placeholder: placement.preview ? () => '' : placeholders(placement.block, view, ledger.waitingSources()),
      listToTop,
      split: splitFor(placement, view),
    },
    {
      typing: (i, text) => ledger.type(i, text),
      key: (i, e) => key(placement, i, e),
      leave: (i) => ledger.leave(i),
      chooseSuggestion: (listIndex) => ledger.adoptSuggestion(ledger.typingColumn, listIndex),
      setMark: (listIndex) => ledger.setMark(listIndex),
    },
  )
}
