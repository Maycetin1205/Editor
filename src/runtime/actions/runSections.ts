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

export async function runSections(
  el: HTMLElement,
  eventKey: string,
  steps: readonly RuntimeStep[],
  context: PlaceholderValues,
): Promise<ActionResult> {
  let written = false
  let writeFailed = false
  try {
    const sections = sectionsOf(steps)
    let stopped: { reason?: JobReason } | null = null
    let unconfirmed: JobReason | undefined
    const take = (result: RunResult): void => {
      if (result.written) written = true
      if (result.writeFailed) writeFailed = true
      if (result.unconfirmed && unconfirmed !== NO_CONFIRMATION) {
        unconfirmed = result.unconfirmedReason ?? NOT_ACKNOWLEDGED
      }
      if (result.failed) stopped = result.reason === undefined ? {} : { reason: result.reason }
    }

    let transcript: Transcript | undefined
    for (const section of sections) {
      if (section.kind === 'once') {
        const result = await runSteps(el, steps, context, undefined, section.slots, transcript)
        transcript = result.transcript
        take(result)
        if (stopped) break
        continue
      }
      if (section.blockId === '') {
        stopped = {}
        break
      }
      const carrier = searchCarrier(el.ownerDocument ?? document, section.blockId)
      const list = carrier && rowsOfList(carrier, section.kind)
      if (!list) {
        stopped = {}
        break
      }
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
        take(result)
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
      if (stopped) break
    }

    if (written) maskHost().requestFreshData()
    const end: { reason?: JobReason } | null = stopped
    const failedWrite = writeFailed ? { writeFailed } : {}
    if (end === null) {
      return unconfirmed === undefined
        ? { state: 'ran', written }
        : { state: 'unconfirmed', written, reason: unconfirmed }
    }
    return end.reason === undefined
      ? { state: 'cancelled', written, ...failedWrite }
      : { state: 'failed', written, reason: end.reason, ...failedWrite }
  } catch (error) {
    warn(`Aktion "${eventKey}" gescheitert`, error)
    return { state: 'failed', written, ...(writeFailed ? { writeFailed } : {}) }
  }
}
