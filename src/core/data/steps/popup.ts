import type { Unread } from '../../unread'
import type { RuntimeStepBase, StepAdapter, StepBase } from './stepAdapter'

function popupIdRead(raw: Unread<{ popupId: string }>): string | null {
  return typeof raw.popupId === 'string' ? raw.popupId : null
}

function popupNameRead(raw: Unread<{ popup: string; popupId: string }>): string | null {
  if (typeof raw.popup === 'string') return raw.popup
  return typeof raw.popupId === 'string' ? '' : null
}

function popupIdMoved(popupId: string, newId: (oldId: string) => string | undefined): string | undefined {
  return popupId === '' ? undefined : newId(popupId)
}

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
