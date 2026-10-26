import type { PendingKind, RunReportElement } from '../../core/block/capability'
import { contractOf } from '../../core/block/registry'
import { NO_CONFIRMATION, NOT_ACKNOWLEDGED, type JobReason } from '../../core/data/jobs'
import type { PlaceholderValues } from '../../core/data/relations'
import { sectionsOf } from '../../core/data/steps/chainsRead'
import type { RuntimeStep } from '../../core/data/steps/steps'
import { maskHost } from '../host'
import { warn } from '../log'
import type { ActionResult } from './actionResult'
import { searchCarrier } from './carrier'
import { runSteps, type RunResult, type RunRow, type Transcript } from './runSteps'

type RowsCarrier = HTMLElement

interface ListRun {
  rows: RunRow[]
  report: RunReportElement
  open: (key: string) => boolean
}

function bookedRows(raw: readonly { record: string; values: readonly string[] }[]): RunRow[] {
  return raw.map((z) => ({ record: z.record, key: z.record, values: z.values }))
}

function rowsOfList(carrier: RowsCarrier, kind: PendingKind): ListRun | undefined {
  if (kind === 'captured') {
    const capture = contractOf(carrier, 'capture')
    return (
      capture && {
        report: capture,
        rows: capture.capturedRows.map((values, slot) => ({
          record: '',
          key: capture.capturedKey[slot] ?? String(slot),
          values,
          picks: capture.capturedPicks[slot] ?? [],
        })),
        open: (key) => capture.capturedKey.includes(key),
      }
    )
  }
  const change = contractOf(carrier, 'change')
  return (
    change && {
      report: change,
      rows: bookedRows(change.changedRows),
      open: (key) => change.changedRows.some((row) => row.record === key),
    }
  )
}

function rowsContext(context: PlaceholderValues, row: RunRow): PlaceholderValues {
  if (row.record === '') return context
  return { ...context, PINDEX: row.record }
}

function recordOfRun(result: RunResult, row: RunRow): string {
  if (row.record !== '') return row.record
  return result.record || (result.transcript.values.PINDEX ?? '')
}

interface SectionOutcome {
  written: boolean
  writeFailed: boolean
  unconfirmed: JobReason | undefined
  stopped: { reason?: JobReason } | null
}

function takeResult(outcome: SectionOutcome, result: RunResult): void {
  if (result.written) outcome.written = true
  if (result.writeFailed) outcome.writeFailed = true
  if (result.unconfirmed && outcome.unconfirmed !== NO_CONFIRMATION) {
    outcome.unconfirmed = result.unconfirmedReason ?? NOT_ACKNOWLEDGED
  }
  if (result.failed) outcome.stopped = result.reason === undefined ? {} : { reason: result.reason }
}

// The steps of a section once per open row of the list it reads; the list
// hears of every row that starts, fails or is done.
async function runRows(
  el: HTMLElement,
  steps: readonly RuntimeStep[],
  context: PlaceholderValues,
  section: { kind: PendingKind; blockId: string; slots: ReadonlySet<number> },
  list: ListRun,
  transcript: Transcript | undefined,
  outcome: SectionOutcome,
): Promise<void> {
  for (const row of list.rows) {
    if (!list.open(row.key)) continue
    list.report.rowWrites(section.kind, row.key)

    let result: RunResult
    try {
      result = await runSteps(
        el,
        steps,
        rowsContext(context, row),
        (blockId, columnsIndex) => (blockId === section.blockId ? String(row.values[columnsIndex] ?? '') : ''),
        section.slots,
        transcript,
        row.key,
        row.picks,
      )
    } catch (error) {
      list.report.rowFailed(section.kind, row.key)
      throw error
    }
    takeResult(outcome, result)
    if (result.failed) {
      list.report.rowFailed(section.kind, row.key, result.reason)
      break
    }
    list.report.runDone(section.kind, [
      {
        key: row.key,
        record: recordOfRun(result, row),
        shown: result.shown,
        ...(result.booked === undefined ? {} : { row: result.booked }),
      },
    ])
  }
}

function actionResultOf(outcome: SectionOutcome): ActionResult {
  const { written, writeFailed, unconfirmed, stopped } = outcome
  const failedWrite = writeFailed ? { writeFailed } : {}
  if (stopped === null) {
    return unconfirmed === undefined
      ? { state: 'ran', written }
      : { state: 'unconfirmed', written, reason: unconfirmed }
  }
  return stopped.reason === undefined
    ? { state: 'cancelled', written, ...failedWrite }
    : { state: 'failed', written, reason: stopped.reason, ...failedWrite }
}

export async function runSections(
  el: HTMLElement,
  eventKey: string,
  steps: readonly RuntimeStep[],
  context: PlaceholderValues,
): Promise<ActionResult> {
  const outcome: SectionOutcome = { written: false, writeFailed: false, unconfirmed: undefined, stopped: null }
  try {
    let transcript: Transcript | undefined
    for (const section of sectionsOf(steps)) {
      if (section.kind === 'once') {
        const result = await runSteps(el, steps, context, undefined, section.slots, transcript)
        transcript = result.transcript
        takeResult(outcome, result)
        if (outcome.stopped) break
        continue
      }
      const carrier = section.blockId === '' ? undefined : searchCarrier(el.ownerDocument ?? document, section.blockId)
      const list = carrier && rowsOfList(carrier, section.kind)
      if (!list) {
        outcome.stopped = {}
        break
      }
      await runRows(
        el,
        steps,
        context,
        { kind: section.kind, blockId: section.blockId, slots: section.slots },
        list,
        transcript,
        outcome,
      )
      if (outcome.stopped) break
    }
    if (outcome.written) maskHost().requestFreshData()
    return actionResultOf(outcome)
  } catch (error) {
    warn(`Aktion "${eventKey}" gescheitert`, error)
    return { state: 'failed', written: outcome.written, ...(outcome.writeFailed ? { writeFailed: true } : {}) }
  }
}
