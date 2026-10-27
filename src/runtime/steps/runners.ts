import type { RuntimeStep, StepKind } from '../../core/data/steps/steps'
import { confirmRunner } from './confirm'
import { popupCloseRunner, popupOpenRunner } from './popupRunners'
import { relationRunner } from './relation'
import { startToolRunner } from './startTool'
import type { StepRunner } from './stepRunner'

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
