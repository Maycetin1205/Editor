import type { RuntimeStepBase, StepAdapter, StepBase } from './stepAdapter'

export interface ConfirmStep extends StepBase {
  kind: 'CONFIRM'
}

export interface RuntimeConfirmStep extends RuntimeStepBase {
  kind: 'CONFIRM'
}

export const confirm: StepAdapter<ConfirmStep, RuntimeConfirmStep> = {
  kind: 'CONFIRM',
  answers: false,
  read: (_raw, base) => ({ id: base.id, kind: 'CONFIRM', resultName: base.resultName }),
  readExported: (_raw, resultName) => ({ kind: 'CONFIRM', resultName }),
  export: (step) => ({ kind: step.kind, resultName: step.resultName }),
  bindings: () => [],
  withBindings: (step) => step,
  withBlockIds: (step) => step,
  relationId: () => '',
}
