import type { Order } from '../orders/orders'
import type { Delivery } from '../deliveries/deliveries'
import { WITHOUT_RESTRICTION, type QueryRestriction } from '../deliveries/message'
import type { LoadRelation } from '../deliveries/relationRows'
import type { GetValue } from '../deliveries/relationValue'
import type { Write } from '../writes/writes'

export interface SourceChoice {
  headerKey: string
  area: string
  openRecord: boolean
  load: LoadRelation | null
  getValue: GetValue
  recordField: string
  restriction: QueryRestriction
}

export const EMPTY_CHOICE: SourceChoice = {
  headerKey: '',
  area: '',
  openRecord: false,
  load: null,
  getValue: { relationId: '', parameter: [] },
  recordField: '',
  restriction: WITHOUT_RESTRICTION,
}

interface OrderAndDelivery {
  order: Order
  delivery: Delivery
}

interface SourceDescriptor extends OrderAndDelivery {
  write: Write
}

export interface SourcePreset<P extends string> {
  id: P
  name: string
  keyLabel: string
  columnsLabel: string
  tableId: string
  key(raw: string): string
  prefixed: boolean
  list(choice: SourceChoice): OrderAndDelivery
  openRecord?: OrderAndDelivery
  fetches: boolean
  writes: boolean
}

export function descriptorFor<P extends string>(preset: SourcePreset<P>, choice: SourceChoice): SourceDescriptor {
  const recordField = choice.recordField.trim()
  const write: Write = preset.writes && recordField !== '' ? { kind: 'putRelation', recordField } : { kind: 'none' }
  if (preset.fetches && choice.load) {
    return { order: { kind: 'none' }, delivery: { kind: 'relationRows', ...choice.load }, write }
  }
  if (preset.openRecord && choice.openRecord) return { ...preset.openRecord, write }
  return { ...preset.list(choice), write }
}
