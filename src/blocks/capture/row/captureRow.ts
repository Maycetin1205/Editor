import type { RowLayout } from '../../parts/cell'
import type { Entry } from '../../lookup/lookup'
import { SuggestionState } from '../../lookup/suggestionState'
import { SplitState, type SplitPick } from '../split/splitState'
import type { CaptureContext } from './context'

export interface RowHost {
  block: HTMLElement

  context: () => CaptureContext

  layout: () => RowLayout

  report: () => void

  focusCell: (index: number) => void
}

interface TypedCells {
  readonly typed: Map<number, string>

  // Cells that hold the row back: their text names no record, or they are
  // required and empty.
  readonly held: Set<number>

  // Linked cells whose source has not come yet.
  readonly waiting: Set<number>

  // The cell typed in, -1 for none; its suggestions are the ones shown.
  cursor: number

  // The row is to be captured as soon as its waiting cells have settled.
  captureAsked: boolean
}

interface ChosenRecords {
  readonly chosen: Map<string, unknown>

  // Sources whose record the operator chose; the others follow from keys.
  readonly byHand: Set<string>
}

interface RowSplit {
  readonly list: SplitState

  picks: SplitPick[]

  // The operator confirmed the picks; typing anew asks again.
  done: boolean
}

// The typing row as the state of its jobs: typing.ts, linkedRecords.ts,
// computedCells.ts, suggestions.ts and rowSplit.ts work on it.
export interface CaptureRow {
  readonly host: RowHost

  readonly cells: TypedCells

  readonly records: ChosenRecords

  computed: Map<number, string>

  readonly suggestions: SuggestionState<Entry>

  readonly split: RowSplit
}

export function createCaptureRow(host: RowHost): CaptureRow {
  return {
    host,
    cells: { typed: new Map(), held: new Set(), waiting: new Set(), cursor: -1, captureAsked: false },
    records: { chosen: new Map(), byHand: new Set() },
    computed: new Map(),
    suggestions: new SuggestionState<Entry>(),
    split: { list: new SplitState(), picks: [], done: false },
  }
}

export function forgetCell(row: CaptureRow, index: number): void {
  row.cells.typed.delete(index)
  row.cells.held.delete(index)
  row.cells.waiting.delete(index)
}

export function clearRow(row: CaptureRow): void {
  row.split.list.stop()
  row.split.picks = []
  row.split.done = false
  row.cells.typed.clear()
  row.records.chosen.clear()
  row.records.byHand.clear()
  row.cells.held.clear()
  row.cells.waiting.clear()
  row.cells.captureAsked = false
  row.computed.clear()
  row.cells.cursor = -1
  row.suggestions.idle()
}
