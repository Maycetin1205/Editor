import type { StepAdapter, StepBase } from './stepAdapter'

export interface ConfirmStep extends StepBase {
  kind: 'CONFIRM'
}

export interface RuntimeConfirmStep {
  kind: 'CONFIRM'
  resultName: string
}

export const ROW_CONFIRM_EVENT = 'ff-row-confirm'

export interface RowConfirm {
  record: string
  answer: Promise<boolean> | null
}

export const confirm: StepAdapter<'CONFIRM'> = {
  kind: 'CONFIRM',
  answers: false,
  read: (_raw, base) => ({ id: base.id, kind: 'CONFIRM', resultName: base.resultName }),
  readExported: (_raw, resultName) => ({ kind: 'CONFIRM', resultName }),
  export: (step) => ({ kind: step.kind, resultName: step.resultName }),
  async run(_step, run) {
    const asked: RowConfirm = { record: run.values.PINDEX ?? '', answer: null }
    run.origin.dispatchEvent(new CustomEvent<RowConfirm>(ROW_CONFIRM_EVENT, { detail: asked }))
    const yes = asked.answer === null ? false : await asked.answer
    return { failed: !yes }
  },
  bindings: () => [],
  withBindings: (step) => step,
  withBlockIds: (step) => step,
  relationId: () => '',
}
