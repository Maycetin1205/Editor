import { maskHost } from '../../../runtime/host'
import { rowFits } from '../../parts/cellSearch'
import type { Entry } from '../../lookup/lookup'
import { orderedSuggestions } from '../../lookup/suggestionList'
import type { KeyAction } from '../../lookup/suggestionState'
import type { CaptureRow } from './captureRow'
import { valueIn } from './cellValues'
import { sameSourceCodes, targetIn, type CaptureContext } from './context'
import { adopt, entriesIn } from './linkedRecords'

// The records of the cell being typed in that fit its text, in any field of
// its source the row shows.
export function suggestionsFor(row: CaptureRow, context: CaptureContext): Entry[] {
  const index = row.cells.cursor
  if (row.suggestions.closed || targetIn(context, index).kind === 'free') return []
  const typed = row.cells.typed.get(index) ?? ''
  if (typed === '') return []
  const codes = sameSourceCodes(context, index)
  const texts = (e: Entry): string[] => [
    e.display,
    e.value,
    ...codes.map((code) => maskHost().readField(e.record, code)),
  ]
  const entries = entriesIn(row, context, index)
  const hit = typed.trim() === '' ? entries : entries.filter((e) => rowFits(texts(e), typed))
  return orderedSuggestions(hit, typed, texts)
}

export function setMark(row: CaptureRow, mark: number): void {
  row.suggestions.setMark(mark)
  row.host.report()
}

// key is a key name of the lookup, see keyOf.
export function decideKey(row: CaptureRow, index: number, key: string): KeyAction {
  const context = row.host.context()
  const target = targetIn(context, index)
  const action = row.suggestions.actionFor(key, {
    listOpen: row.cells.cursor === index && row.suggestions.open,
    fieldEmpty: valueIn(row, context, index) === '',
    typed: row.cells.typed.get(index) !== undefined,
    lookupable: target.kind === 'linked',
    hasRecords: () => entriesIn(row, context, index).length > 0,
    jumps: true,
  })
  if (action !== 'nothing') row.host.report()
  return action
}

export function adoptSuggestion(row: CaptureRow, index: number, listIndex: number): void {
  const hit = row.suggestions.hit[listIndex]
  if (hit === undefined) return
  adopt(row, index, hit.record)
}
