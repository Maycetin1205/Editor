import type { RuntimeConfirmStep } from '../../core/data/steps/confirm'
import type { RuntimePopupCloseStep, RuntimePopupOpenStep } from '../../core/data/steps/popup'
import type { RuntimeStartToolStep } from '../../core/data/steps/startTool'
import type { RuntimeStep, StepKind } from '../../core/data/steps/steps'
import { applyPopupStep } from './popup'
import { relationRunner } from './relation'
import type { StepRunner } from './stepRunner'

// What each kind of step does in the running mask. The relation runner talks
// to SoftEngine and has its own file; the others are a few lines each.

const startToolRunner: StepRunner<RuntimeStartToolStep> = {
  kind: 'START_TOOL',
  run(step, run) {
    const toolNumber = step.toolNumber.trim()
    if (toolNumber === '') return Promise.resolve({ failed: true })
    const params = step.parameter.map((binding) => run.host.resolveParameter(binding, run.parameterValues))
    return Promise.resolve({ failed: !run.host.startTool(toolNumber, params) })
  },
}

export const ROW_CONFIRM_EVENT = 'ff-row-confirm'

// The question a list answers for the row the step runs on: whoever listens
// puts its answer into the detail, nobody listening means no.
export interface RowConfirm {
  record: string
  answer: Promise<boolean> | null
}

const confirmRunner: StepRunner<RuntimeConfirmStep> = {
  kind: 'CONFIRM',
  async run(_step, run) {
    const asked: RowConfirm = { record: run.values.PINDEX ?? '', answer: null }
    run.origin.dispatchEvent(new CustomEvent<RowConfirm>(ROW_CONFIRM_EVENT, { detail: asked }))
    const yes = asked.answer === null ? false : await asked.answer
    return { failed: !yes }
  },
}

const popupOpenRunner: StepRunner<RuntimePopupOpenStep> = {
  kind: 'POPUP_OPEN',
  run(step, run) {
    applyPopupStep(run.root, step.popup, true)
    return Promise.resolve({ failed: false })
  },
}

const popupCloseRunner: StepRunner<RuntimePopupCloseStep> = {
  kind: 'POPUP_CLOSE',
  run(step, run) {
    applyPopupStep(run.root, step.popup, false)
    return Promise.resolve({ failed: false })
  },
}

const STEP_RUNNERS: { [K in StepKind]: StepRunner<RuntimeStep & { kind: K }> } = {
  RELATION: relationRunner,
  POPUP_OPEN: popupOpenRunner,
  POPUP_CLOSE: popupCloseRunner,
  CONFIRM: confirmRunner,
  START_TOOL: startToolRunner,
}

export function stepRunner(kind: StepKind): StepRunner<RuntimeStep> {
  return STEP_RUNNERS[kind]
}
