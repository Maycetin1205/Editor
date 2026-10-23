import { contractOf } from '../core/block/registry'
import { calculated, DECIMALS_MAX, type Calculation, type TermOrigin } from '../core/data/calculation'
import { asNumber, numberText } from '../core/data/number'
import { searchCarrier } from './events'
import { maskState } from './maskState'
import { selectionFor } from './selection'

function columnSum(el: HTMLElement, blockId: string, key: string): string {
  const carrier = searchCarrier(el.ownerDocument, blockId)
  const values = carrier === undefined ? [] : contractOf(carrier, 'capture')?.capturedColumn(key) ?? []
  const total = values.reduce((sum, value) => sum + (asNumber(value) ?? 0), 0)
  return numberText(total, DECIMALS_MAX)
}

function termValue(el: HTMLElement, origin: TermOrigin): string {
  switch (origin.kind) {
    case 'fixed': return origin.value
    case 'chosenRow': {
      const row = selectionFor(origin.blockId)
      return row === undefined ? '' : maskState.host.readField(row, origin.value)
    }
    case 'sum': return columnSum(el, origin.blockId, origin.value)
    default: return ''
  }
}

export function calculatedText(el: HTMLElement, calculation: Calculation): string {
  return calculated(calculation, (origin) => termValue(el, origin))
}
