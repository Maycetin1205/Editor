import type { StartToolStep } from '../../core/data/steps/startTool'
import { StartToolBody } from './StartToolBody'
import type { StepPiece, StepTabPiece } from './stepPiece'

const emptyTool = (id: string): StartToolStep => ({
  id,
  kind: 'START_TOOL',
  resultName: '',
  toolNumber: '',
  parameter: [],
})

export const startToolPiece: StepPiece<'START_TOOL'> = {
  words(step) {
    const nr = step.toolNumber.trim()
    const places = step.parameter.length
    return {
      words: nr === '' ? 'Tool starten' : `Tool ${nr} starten`,
      short: places === 0 ? '' : `${places} ${places === 1 ? 'Stelle' : 'Stellen'}`,
      known: nr !== '',
    }
  },
  tab: () => 'TOOL',
}

export const toolTab: StepTabPiece = {
  key: 'TOOL',
  name: 'Tool',
  start: (id, step) => (step?.kind === 'START_TOOL' ? step : emptyTool(id)),
  Body: StartToolBody,
}
