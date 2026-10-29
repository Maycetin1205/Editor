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
import type { StepOutcome, StepRun } from '../steps/stepRunner'

export interface RunRow {
  record: string
  key: string
  values: readonly string[]
  picks?: readonly CapturedPick[]
  pickedFrom?: string
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

// While a captured row runs, a condition on the source its picks come from
// asks whether that row got any, not what the source shows now.
async function conditionHolds(condition: StepCondition | undefined, run: StepsRun): Promise<boolean> {
  if (condition === undefined) return true
  if (condition.sourceId === run.pickedFrom) return run.picks.length > 0 === condition.rows
  await sourceSettled(condition.sourceId)
  const source = maskHost().source(condition.sourceId)
  const rows = source === undefined ? 0 : maskHost().rows(source).length
  return rows > 0 === condition.rows
}

function readsPick(step: RuntimeStep): boolean {
  return stepAdapter(step.kind)
    .bindings(step)
    .some((b) => b.source === 'splitCell' && b.pick === undefined)
}

function pickValues(pick: CapturedPick): PickValues {
  return { amount: pick.amount, read: (field) => maskHost().readField(pick.record, field) }
}

function jobOriginOf(el: HTMLElement, rowKey?: string): string {
  const block = el.getAttribute(BLOCK_ID_ATTR) ?? el.tagName.toLowerCase()
  return rowKey === undefined ? block : `${block} ${rowKey}`
}

type StepAnswer = NonNullable<StepOutcome['answer']>

// What a run of steps has done so far: whether something was written, and
// how far SoftEngine confirmed it.
interface Tally {
  written: boolean
  unconfirmed: boolean
  unconfirmedReason?: JobReason
  writeFailed: boolean
  record: string
  shown: boolean
  booked?: unknown
}

function noteWrite(tally: Tally, answer: StepAnswer, failed: boolean): void {
  if (!failed) tally.written = true
  else tally.writeFailed = true
  if (answer.confirmed === false) {
    tally.unconfirmed = true
    if (tally.unconfirmedReason !== NO_CONFIRMATION) tally.unconfirmedReason = answer.reason ?? NOT_ACKNOWLEDGED
  }
  if (answer.confirmed === true) {
    tally.shown = true
    if (answer.raw !== undefined) tally.booked = answer.raw
  }
  if (answer.record !== undefined) tally.record = answer.record
}

function resultOf(tally: Tally, transcript: Transcript, failed: boolean, reason?: JobReason): RunResult {
  return {
    written: tally.written,
    failed,
    unconfirmed: tally.unconfirmed,
    ...(tally.unconfirmedReason === undefined ? {} : { unconfirmedReason: tally.unconfirmedReason }),
    writeFailed: tally.writeFailed,
    record: tally.record,
    shown: tally.shown,
    ...(tally.booked === undefined ? {} : { booked: tally.booked }),
    transcript,
    ...(reason === undefined ? {} : { reason }),
  }
}

interface StepsRun {
  el: HTMLElement
  steps: readonly RuntimeStep[]
  rowsCell: ((blockId: string, columnsIndex: number) => string) | undefined
  only: ReadonlySet<number> | undefined
  rowKey: string | undefined
  picks: readonly CapturedPick[]
  pickedFrom: string
  values: Record<string, string | undefined>
  stepResults: string[]
  rawResults: unknown[]
  chosenRow: (giverId: string) => unknown
}

function stepRun(run: StepsRun, slot: number, previousResult: string, pick: CapturedPick | undefined): StepRun {
  const laterRuns = run.steps.some(
    (later, index) =>
      index > slot && (!run.only || run.only.has(index)) && (readsPick(later) ? run.picks.length : 1) > 0,
  )
  return {
    host: maskHost(),
    root: run.el.ownerDocument ?? document,
    origin: run.el,
    jobOrigin: jobOriginOf(run.el, run.rowKey),
    lastForRow: run.rowsCell !== undefined && !laterRuns,
    values: run.values,
    parameterValues: {
      context: run.values,
      previousResult,
      stepResults: run.stepResults,
      stepRawResults: run.rawResults,
      chosenRow: run.chosenRow,
      picks: run.picks.map(pickValues),
      ...(run.rowsCell ? { rowsCell: run.rowsCell } : {}),
      ...(pick === undefined ? {} : { pick: pickValues(pick) }),
    },
  }
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

  pickedFrom = '',
): Promise<RunResult> {
  const values: Record<string, string | undefined> = {
    ...start?.values,
    ...context,
    NOW_DATE: todayAsText(new Date()),
    NOW_TIME: nowTimeAsText(new Date()),
  }
  let previousResult = start?.previousResult ?? ''
  const stepResults: string[] = steps.map((_, i) => start?.stepResults[i] ?? '')
  const rawResults: unknown[] = steps.map((_, i) => start?.rawResults[i])
  const transcript = (): Transcript => ({ values, stepResults, rawResults, previousResult })
  const tally: Tally = { written: false, unconfirmed: false, writeFailed: false, record: '', shown: false }

  // The row chosen when the chain started stays the chosen row of this block
  // for the whole run, whatever the steps select meanwhile.
  const own = giverIdOf(el)
  const chosenAtStart = own === '' ? undefined : selectionFor(own)
  const run: StepsRun = {
    el,
    steps,
    rowsCell,
    only,
    rowKey,
    picks,
    pickedFrom,
    values,
    stepResults,
    rawResults,
    chosenRow: (giverId) => (own !== '' && giverId === own ? chosenAtStart : selectionFor(giverId)),
  }

  for (const [slot, step] of steps.entries()) {
    if (only && !only.has(slot)) continue
    if (!(await conditionHolds(step.onlyIf, run))) continue
    const rounds: (CapturedPick | undefined)[] = readsPick(step) ? [...picks] : [undefined]
    for (const pick of rounds) {
      const outcome = await stepRunner(step.kind).run(step, stepRun(run, slot, previousResult, pick))
      const answer = outcome.answer
      if (answer) {
        stepResults[slot] = answer.value
        rawResults[slot] = answer.raw
        if (answer.wrote) noteWrite(tally, answer, outcome.failed)
        else previousResult = answer.value
      }
      if (outcome.failed) return resultOf(tally, transcript(), true, outcome.reason)
      if (answer && step.resultName !== '') values[step.resultName] = answer.value
    }
  }
  return resultOf(tally, transcript(), false)
}
