import { downloadFile } from './downloadFile'
import { CURRENT_SCHEMA_VERSION } from './maskSchema'
import { storedMaskText } from './maskStorage'
import type { NoticeText } from '../widgets/Notice'

export const NO_MASK = 'ist keine Maske des Editors.'

// The browser holds a mask of a stage this editor does not read. It stays
// there: the slot of the browser is not written while it holds it.
export function storedMaskRefused(step: unknown): NoticeText {
  return {
    title: 'Maske im Browser nicht geöffnet',
    lead:
      `Die Maske im Browser ${whyNotRead(step)} Sie bleibt dort unverändert liegen. ` +
      'Solange sie dort liegt, hält der Editor eine neue Maske nicht im Browser fest; „Speichern“ sichert sie in eine Datei.',
    action: {
      label: 'Alte Maske herunterladen',
      run: () => {
        const text = storedMaskText()
        if (text !== null) downloadFile('aufbau-alte-maske.json', text, 'application/json')
      },
    },
  }
}

export function whyNotRead(step: unknown): string {
  if (typeof step !== 'number') return NO_MASK
  if (step > CURRENT_SCHEMA_VERSION) {
    return (
      `kommt aus einer neueren Fassung des Editors (Stufe ${step}, dieser kennt bis ${CURRENT_SCHEMA_VERSION}). ` +
      'Erst den Editor auf den neuesten Stand bringen.'
    )
  }
  return `kommt aus einer zu alten Fassung des Editors (Stufe ${step}), die dieser nicht mehr liest.`
}
