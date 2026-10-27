import { ConfirmBody } from './ConfirmBody'
import type { StepSummary, StepTabDef } from './stepTypes'

export const confirmSummary: StepSummary<'CONFIRM'> = {
  words: () => ({ words: 'Rückfrage: Löschen oder Abbrechen', short: '', known: true }),
  tab: () => 'ASK',
}

export const confirmTab: StepTabDef = {
  key: 'ASK',
  name: 'Rückfrage',
  start: (id, step) => (step?.kind === 'CONFIRM' ? step : { id, kind: 'CONFIRM', resultName: '' }),
  Body: ConfirmBody,
}
