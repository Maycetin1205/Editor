import type { RuntimeConfirmStep } from '../../core/data/steps/confirm'
import type { StepRunner } from './stepRunner'

export const ROW_CONFIRM_EVENT = 'ff-row-confirm'

// The question a list answers for the row the step runs on: whoever listens
// puts its answer into the detail, nobody listening means no.
export interface RowConfirm {
  record: string
  answer: Promise<boolean> | null
}

export const confirmRunner: StepRunner<RuntimeConfirmStep> = {
  kind: 'CONFIRM',
  async run(_step, run) {
    const asked: RowConfirm = { record: run.values.PINDEX ?? '', answer: null }
    run.origin.dispatchEvent(new CustomEvent<RowConfirm>(ROW_CONFIRM_EVENT, { detail: asked }))
    const yes = asked.answer === null ? false : await asked.answer
    return { failed: !yes }
  },
}
