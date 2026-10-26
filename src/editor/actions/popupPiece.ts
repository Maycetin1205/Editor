import type { PopupCloseStep } from '../../core/data/steps/popupClose'
import type { PopupOpenStep } from '../../core/data/steps/popupOpen'
import { PopupBody } from './PopupBody'
import type { StepContext, StepPiece, StepTabPiece, StepWords } from './piece'

type PopupStep = PopupOpenStep | PopupCloseStep

function popupWords(step: PopupStep, context: StepContext): StepWords {
  const name = context.popups.find((p) => p.value === step.popupId)?.name
  const verb = step.kind === 'POPUP_OPEN' ? 'öffnen' : 'schließen'
  return { words: name ? `Popup ${name} ${verb}` : `Popup ${verb}`, short: '', known: name !== undefined }
}

export const popupOpenPiece: StepPiece<'POPUP_OPEN'> = { words: popupWords, tab: () => 'POPUP' }

export const popupClosePiece: StepPiece<'POPUP_CLOSE'> = { words: popupWords, tab: () => 'POPUP' }

export const popupTab: StepTabPiece = {
  key: 'POPUP',
  name: 'Popup',
  start: (id, step) =>
    step?.kind === 'POPUP_OPEN' || step?.kind === 'POPUP_CLOSE'
      ? step
      : { id, kind: 'POPUP_OPEN', resultName: '', popupId: '' },
  Body: PopupBody,
}
