import { ConfirmBody } from './ConfirmBody'
import type { StepPiece, StepTabPiece } from './piece'

export const confirmPiece: StepPiece<'CONFIRM'> = {
  words: () => ({ words: 'Rückfrage: Löschen oder Abbrechen', short: '', known: true }),
  tab: () => 'ASK',
}

export const confirmTab: StepTabPiece = {
  key: 'ASK',
  name: 'Rückfrage',
  start: (id, step) => (step?.kind === 'CONFIRM' ? step : { id, kind: 'CONFIRM', resultName: '' }),
  Body: ConfirmBody,
}
