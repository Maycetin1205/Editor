import type { RuntimeStepBase, StepAdapter, StepBase } from './stepAdapter'
import { popupIdMoved, popupIdRead, popupNameRead } from './popupStep'

export interface PopupOpenStep extends StepBase {
  kind: 'POPUP_OPEN'
  popupId: string
}

export interface RuntimePopupOpenStep extends RuntimeStepBase {
  kind: 'POPUP_OPEN'
  popup: string
}

export const popupOpen: StepAdapter<PopupOpenStep, RuntimePopupOpenStep> = {
  kind: 'POPUP_OPEN',
  answers: false,
  read(raw, base) {
    const popupId = popupIdRead(raw)
    return popupId === null ? null : { id: base.id, kind: 'POPUP_OPEN', resultName: base.resultName, popupId }
  },
  readExported(raw, resultName) {
    const popup = popupNameRead(raw)
    return popup === null ? null : { kind: 'POPUP_OPEN', resultName, popup }
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
