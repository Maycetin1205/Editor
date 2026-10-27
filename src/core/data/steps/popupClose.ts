import type { RuntimeStepBase, StepAdapter, StepBase } from './stepAdapter'
import { popupIdMoved, popupIdRead, popupNameRead } from './popupStep'

export interface PopupCloseStep extends StepBase {
  kind: 'POPUP_CLOSE'
  popupId: string
}

export interface RuntimePopupCloseStep extends RuntimeStepBase {
  kind: 'POPUP_CLOSE'
  popup: string
}

export const popupClose: StepAdapter<PopupCloseStep, RuntimePopupCloseStep> = {
  kind: 'POPUP_CLOSE',
  answers: false,
  read(raw, base) {
    const popupId = popupIdRead(raw)
    return popupId === null ? null : { id: base.id, kind: 'POPUP_CLOSE', resultName: base.resultName, popupId }
  },
  readExported(raw, resultName) {
    const popup = popupNameRead(raw)
    return popup === null ? null : { kind: 'POPUP_CLOSE', resultName, popup }
  },
  export(step, refs) {
    return { kind: step.kind, resultName: step.resultName, popup: refs.popupName(step.popupId) }
  },
  bindings: () => [],
  withBindings: (step) => step,
  withBlockIds(step, newId) {
    const popupId = popupIdMoved(step.popupId, newId)
    return popupId === undefined ? step : { ...step, popupId }
  },
  relationId: () => '',
}
