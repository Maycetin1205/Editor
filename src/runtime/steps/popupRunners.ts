import type { RuntimePopupCloseStep } from '../../core/data/steps/popupClose'
import type { RuntimePopupOpenStep } from '../../core/data/steps/popupOpen'
import { applyPopupStep } from './popup'
import type { StepRunner } from './stepRunner'

export const popupOpenRunner: StepRunner<RuntimePopupOpenStep> = {
  kind: 'POPUP_OPEN',
  run(step, run) {
    applyPopupStep(run.root, step.popup, true)
    return Promise.resolve({ failed: false })
  },
}

export const popupCloseRunner: StepRunner<RuntimePopupCloseStep> = {
  kind: 'POPUP_CLOSE',
  run(step, run) {
    applyPopupStep(run.root, step.popup, false)
    return Promise.resolve({ failed: false })
  },
}
