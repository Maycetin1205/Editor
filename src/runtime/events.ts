import { BLOCK_ID_ATTR } from '../core/data/actions'
import { sectionsOf, chainsRead } from '../core/data/steps/chainsRead'
import { stepAdapter, type RuntimeStep } from '../core/data/steps/steps'
import { stepRunner } from './steps/runners'
import type { CapturedPick, RunReportElement, PendingKind } from '../core/block/capability'
import { giverIdOf, selectionFor } from './selection'
import { maskState } from './maskState'
import { contractOf, readActionValue } from '../core/block/registry'
import type { ValueCarrier } from '../core/block/capability'
import type { PickValues } from '../core/data/actions'
import { nowTimeAsText, todayAsText, type PlaceholderValues } from '../core/data/relations'
import { NO_CONFIRMATION, NOT_ACKNOWLEDGED, type JobReason } from '../core/data/jobs'
import type { ActionResult } from './actionResult'
import { warn } from './log'
import { actionEnded, actionStarted } from './notice'
import { sourceSettled } from './fetchingSources'
import type { StepCondition } from '../core/data/steps/stepAdapter'

const running = new WeakMap<HTMLElement, Set<string>>()

type RowsCarrier = HTMLElement

export function searchCarrier(root: ParentNode, blockId: string): RowsCarrier | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`)).find(
    (el) => el.getAttribute(BLOCK_ID_ATTR) === blockId,
  )
}

interface RunRow {
  record: string
  key: string
  values: readonly string[]
  picks?: readonly CapturedPick[]
}

interface RunResult {
  written: boolean

  failed: boolean

  reason?: JobReason

  unconfirmed: boolean

  unconfirmedReason?: JobReason

  writeFailed: boolean

  record: string
  shown: boolean

  booked?: unknown

  transcript: Transcript
}

interface Transcript {
  values: Record<string, string | undefined>

  stepResults: readonly string[]

  rawResults: readonly unknown[]

  previousResult: string
}

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

async function conditionHolds(condition: StepCondition | undefined): Promise<boolean> {
  if (condition === undefined) return true
  await sourceSettled(condition.sourceId)
  const source = maskState.host.source(condition.sourceId)
  const rows = source === undefined ? 0 : maskState.host.rows(source).length
  return rows > 0 === condition.rows
}

function readsPick(step: RuntimeStep): boolean {
  return stepAdapter(step.kind)
    .bindings(step)
    .some((b) => b.source === 'splitCell')
}

function pickValues(pick: CapturedPick): PickValues {
  return { amount: pick.amount, read: (field) => maskState.host.readField(pick.record, field) }
}

function jobOriginOf(el: HTMLElement, rowKey?: string): string {
  const block = el.getAttribute(BLOCK_ID_ATTR) ?? el.tagName.toLowerCase()
  return rowKey === undefined ? block : `${block} ${rowKey}`
}

async function runSteps(
  el: HTMLElement,
  steps: readonly RuntimeStep[],
  context: PlaceholderValues,
  rowsCell: ((blockId: string, columnsIndex: number) => string) | undefined,

  only?: ReadonlySet<number>,

  start?: Transcript,

  rowKey?: string,

  picks: readonly CapturedPick[] = [],
): Promise<RunResult> {
  const host = maskState.host
  let written = false
  let unconfirmed = false
  let unconfirmedReason: JobReason | undefined
  let writeFailed = false
  let record = ''
  let shown = false
  let booked: unknown
  const values: Record<string, string | undefined> = {
    ...start?.values,
    ...context,
    NOW_DATE: todayAsText(new Date()),
    NOW_TIME: nowTimeAsText(new Date()),
  }
  let previousResult = start?.previousResult ?? ''

  const stepResults: string[] = steps.map((_, i) => start?.stepResults[i] ?? '')

  const rawResults: unknown[] = steps.map((_, i) => start?.rawResults[i])
  const transcript = (): Transcript => ({
    values,
    stepResults,
    rawResults,
    previousResult,
  })
  const own = giverIdOf(el)
  const chosenAtStart = own === '' ? undefined : selectionFor(own)
  const chosenRow = (giverId: string): unknown =>
    own !== '' && giverId === own ? chosenAtStart : selectionFor(giverId)
  const runs = (slot: number): number => (readsPick(steps[slot]) ? picks.length : 1)
  const laterRuns = (slot: number): boolean =>
    steps.some((_, later) => later > slot && (!only || only.has(later)) && runs(later) > 0)
  for (const [slot, step] of steps.entries()) {
    if (only && !only.has(slot)) continue
    if (!(await conditionHolds(step.onlyIf))) continue
    const rounds: (CapturedPick | undefined)[] = readsPick(step) ? [...picks] : [undefined]
    for (const pick of rounds) {
      const outcome = await stepRunner(step.kind).run(step, {
        host,
        root: el.ownerDocument ?? document,
        origin: el,
        jobOrigin: jobOriginOf(el, rowKey),
        lastForRow: rowsCell !== undefined && !laterRuns(slot),
        values,
        parameterValues: {
          context: values,
          previousResult,
          stepResults,
          stepRawResults: rawResults,
          chosenRow,
          ...(rowsCell ? { rowsCell } : {}),
          ...(pick === undefined ? {} : { pick: pickValues(pick) }),
        },
      })
      const answer = outcome.answer
      if (answer) {
        stepResults[slot] = answer.value
        rawResults[slot] = answer.raw
        if (answer.wrote) {
          if (!outcome.failed) written = true
          else writeFailed = true
          if (answer.confirmed === false) {
            unconfirmed = true
            if (unconfirmedReason !== NO_CONFIRMATION) unconfirmedReason = answer.reason ?? NOT_ACKNOWLEDGED
          }
          if (answer.confirmed === true) {
            shown = true
            if (answer.raw !== undefined) booked = answer.raw
          }
          if (answer.record !== undefined) record = answer.record
        } else {
          previousResult = answer.value
        }
      }
      if (outcome.failed) {
        return {
          written,
          failed: true,
          unconfirmed,
          ...(unconfirmedReason === undefined ? {} : { unconfirmedReason }),
          writeFailed,
          record,
          shown,
          ...(booked === undefined ? {} : { booked }),
          transcript: transcript(),
          ...(outcome.reason === undefined ? {} : { reason: outcome.reason }),
        }
      }
      if (answer && step.resultName !== '') values[step.resultName] = answer.value
    }
  }
  return {
    written,
    failed: false,
    unconfirmed,
    ...(unconfirmedReason === undefined ? {} : { unconfirmedReason }),
    writeFailed,
    record,
    shown,
    ...(booked === undefined ? {} : { booked }),
    transcript: transcript(),
  }
}

export type { ActionResult, RunState } from './actionResult'

function emptyRequired(
  root: ParentNode,
  steps: readonly RuntimeStep[],
): { field: ValueCarrier; prop: string } | undefined {
  for (const step of steps) {
    for (const binding of stepAdapter(step.kind).bindings(step)) {
      if (binding.source !== 'blockValue') continue
      const el = searchCarrier(root, binding.blockId ?? '')
      const field = el && contractOf(el, 'actionValue')
      if (!el || !field?.valueRequired(binding.value)) continue
      if (readActionValue(el, binding.value).trim() === '') return { field, prop: binding.value }
    }
  }
  return undefined
}

export async function runEvent(
  el: HTMLElement,
  eventKey: string,
  context: PlaceholderValues,
  lockKey: string = eventKey,
): Promise<ActionResult> {
  try {
    return await runChain(el, eventKey, context, lockKey)
  } catch (error) {
    warn(`Aktion "${eventKey}" nicht gestartet`, error)
    return { state: 'failed', written: false }
  }
}

async function runChain(
  el: HTMLElement,
  eventKey: string,
  context: PlaceholderValues,
  lockKey: string,
): Promise<ActionResult> {
  const steps = chainsRead(el.getAttribute('data-ff-actions'))[eventKey]
  if (!steps || steps.length === 0) return { state: 'ran', written: false }

  const missing = emptyRequired(el.ownerDocument ?? document, steps)
  if (missing) {
    missing.field.focusValue(missing.prop)
    return { state: 'cancelled', written: false }
  }

  let locks = running.get(el)
  if (!locks) {
    locks = new Set()
    running.set(el, locks)
  }
  if (locks.has(lockKey)) return { state: 'busy', written: false }
  locks.add(lockKey)
  actionStarted(el)
  let result: ActionResult = { state: 'failed', written: false }
  try {
    result = await runSections(el, eventKey, steps, context)
  } finally {
    locks.delete(lockKey)
    actionEnded(el, result)
  }
  return result
}

async function runSections(
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

    if (written) maskState.host.requestFreshData()
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
