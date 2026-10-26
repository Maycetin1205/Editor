import type { CapturedPick } from '../../core/block/capability'
import { BLOCK_ID_ATTR, type PickValues } from '../../core/data/actions'
import { NO_CONFIRMATION, NOT_ACKNOWLEDGED, type JobReason } from '../../core/data/jobs'
import { nowTimeAsText, todayAsText, type PlaceholderValues } from '../../core/data/relations'
import type { StepCondition } from '../../core/data/steps/stepAdapter'
import { stepAdapter, type RuntimeStep } from '../../core/data/steps/steps'
import { sourceSettled } from '../fetchingSources'
import { maskHost } from '../host'
import { giverIdOf, selectionFor } from '../selection'
import { stepRunner } from '../steps/runners'

export interface RunRow {
  record: string
  key: string
  values: readonly string[]
  picks?: readonly CapturedPick[]
}

export interface RunResult {
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

export interface Transcript {
  values: Record<string, string | undefined>

  stepResults: readonly string[]

  rawResults: readonly unknown[]

  previousResult: string
}

async function conditionHolds(condition: StepCondition | undefined): Promise<boolean> {
  if (condition === undefined) return true
  await sourceSettled(condition.sourceId)
  const source = maskHost().source(condition.sourceId)
  const rows = source === undefined ? 0 : maskHost().rows(source).length
  return rows > 0 === condition.rows
}

function readsPick(step: RuntimeStep): boolean {
  return stepAdapter(step.kind)
    .bindings(step)
    .some((b) => b.source === 'splitCell')
}

function pickValues(pick: CapturedPick): PickValues {
  return { amount: pick.amount, read: (field) => maskHost().readField(pick.record, field) }
}

function jobOriginOf(el: HTMLElement, rowKey?: string): string {
  const block = el.getAttribute(BLOCK_ID_ATTR) ?? el.tagName.toLowerCase()
  return rowKey === undefined ? block : `${block} ${rowKey}`
}

export async function runSteps(
  el: HTMLElement,
  steps: readonly RuntimeStep[],
  context: PlaceholderValues,
  rowsCell: ((blockId: string, columnsIndex: number) => string) | undefined,

  only?: ReadonlySet<number>,

  start?: Transcript,

  rowKey?: string,

  picks: readonly CapturedPick[] = [],
): Promise<RunResult> {
  const host = maskHost()
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
