import type { KeyPair } from '../../../core/data/extraSources'
import { outsideValue } from '../../../runtime/foreignSources'
import { maskHost } from '../../../runtime/host'
import { lookupEntries, sourcesRows, type Entry } from '../../lookup/lookup'
import { forgetCell, type CaptureRow } from './captureRow'
import {
  cellTargetOf,
  displayColumnIn,
  fittingRecords,
  linkedSourcesIn,
  targetIn,
  type CaptureContext,
} from './context'

export function recordField(row: CaptureRow, sourceId: string, field: string): string {
  const record = row.records.chosen.get(sourceId)
  return record === undefined ? '' : maskHost().readField(record, field)
}

// The cells of the source show the record from now on, not what was typed.
export function chooseRecord(row: CaptureRow, context: CaptureContext, sourceId: string, record: unknown): void {
  if (record === undefined) {
    row.records.chosen.delete(sourceId)
    row.records.byHand.delete(sourceId)
  } else row.records.chosen.set(sourceId, record)
  for (let i = 0; i < context.columns.length; i++) {
    if (cellTargetOf(context.columns[i], context.sourceId).sourceId === sourceId) forgetCell(row, i)
  }
}

// The value a key field of the record must have: from the partner's record
// (empty while it has none), else from the record of the block's own source,
// else from a record the operator chose for another source. undefined while
// nothing says.
function keyValue(
  row: CaptureRow,
  context: CaptureContext,
  partnerId: string,
  field: string,
  except: string,
): string | undefined {
  if (partnerId !== '' && partnerId !== context.sourceId) return recordField(row, partnerId, field)
  const base = row.records.chosen.get(context.sourceId)
  if (base !== undefined) return maskHost().readField(base, field)
  for (const sourceId of linkedSourcesIn(context)) {
    if (sourceId === except || !row.records.byHand.has(sourceId)) continue

    const partner = context.partnerOf(sourceId)
    if (partner !== '' && partner !== context.sourceId) continue
    const record = row.records.chosen.get(sourceId)
    if (record === undefined) continue
    for (const pair of context.pairsTo(sourceId)) {
      if (pair.from !== undefined || pair.fromField !== field) continue
      const value = maskHost().readField(record, pair.toField)
      if (value !== '') return value
    }
  }
  return undefined
}

function pairValue(
  row: CaptureRow,
  context: CaptureContext,
  partnerId: string,
  pair: KeyPair,
  except: string,
): string | undefined {
  return outsideValue(pair, row.host.block) ?? keyValue(row, context, partnerId, pair.fromField, except)
}

export function possibleRecords(
  row: CaptureRow,
  context: CaptureContext,
  sourceId: string,
  rows: readonly unknown[],
): unknown[] {
  const partnerId = context.partnerOf(sourceId)
  return fittingRecords(context.pairsTo(sourceId), (pair) => pairValue(row, context, partnerId, pair, sourceId), rows)
}

// Drops a chosen record its keys no longer fit, or chooses the one record the
// keys leave. True when the choice moved.
function syncSource(row: CaptureRow, context: CaptureContext, sourceId: string): boolean {
  const pairs = context.pairsTo(sourceId)
  if (pairs.length === 0) return false
  const partnerId = context.partnerOf(sourceId)
  const record = row.records.chosen.get(sourceId)
  if (record !== undefined) {
    const fits = pairs.every((p) => {
      const expected = pairValue(row, context, partnerId, p, sourceId)
      return expected === undefined || (expected !== '' && expected === maskHost().readField(record, p.toField))
    })
    if (fits) return false
    chooseRecord(row, context, sourceId, undefined)
    return true
  }
  if (!pairs.some((p) => pairValue(row, context, partnerId, p, sourceId) !== undefined)) return false
  const rows = sourcesRows(sourceId)
  if (rows === null) return false
  const fitting = possibleRecords(row, context, sourceId, rows)
  if (fitting.length !== 1) return false
  chooseRecord(row, context, sourceId, fitting[0])
  row.records.byHand.delete(sourceId)
  return true
}

// One choice can settle the keys of the next source, hence the rounds.
export function syncChosen(row: CaptureRow, context: CaptureContext): void {
  const sources = linkedSourcesIn(context)
  for (let round = 0; round <= sources.length; round++) {
    let moved = false
    for (const sourceId of sources) {
      if (syncSource(row, context, sourceId)) moved = true
    }
    if (!moved) break
  }
}

export function entriesIn(row: CaptureRow, context: CaptureContext, index: number): Entry[] {
  const target = targetIn(context, index)
  if (target.kind !== 'linked' || target.sourceId === '' || target.code === '') return []
  const rows = sourcesRows(target.sourceId)
  if (rows === null) return []
  const records = possibleRecords(row, context, target.sourceId, rows)
  return lookupEntries(records, displayColumnIn(context, index)?.code ?? '', target.code)
}

// A record of the block's own source carries the keys of all others, so their
// records are chosen anew from it.
export function takeRecord(row: CaptureRow, context: CaptureContext, index: number, record: unknown): void {
  const target = targetIn(context, index)
  if (target.sourceId === '') return
  row.split.done = false
  chooseRecord(row, context, target.sourceId, record)
  row.records.byHand.add(target.sourceId)
  if (target.kind === 'own') {
    for (const id of [...row.records.chosen.keys()]) {
      if (id !== target.sourceId) chooseRecord(row, context, id, undefined)
    }
  }
  syncChosen(row, context)
}

export function adopt(row: CaptureRow, index: number, record: unknown): void {
  takeRecord(row, row.host.context(), index, record)
  row.cells.cursor = -1
  row.suggestions.idle()
  row.host.report()
}
