import type { Parameter } from '../actions'
import type { DataSource } from '../dataSources'
import type { RelationTemplate } from '../relations'
import type { Delivery, DeliveryKind, RuntimeDelivery } from './deliveries'
import type { RuntimeQuery } from './message'
import type { RuntimeLoadRelation } from './relationRows'
import type { RuntimeGetValue } from './relationValue'
import type { Unread } from '../../unread'

type DeliveryOf<K extends DeliveryKind> = Delivery & { kind: K }
export type RuntimeDeliveryOf<K extends DeliveryKind> = RuntimeDelivery & { kind: K }

interface ExportContext {
  usedFields: ReadonlySet<string> | undefined
  orderedFields: (source: DataSource) => string
  relations: readonly RelationTemplate[]
}

export interface RuntimeEntry {
  openRecord?: true
  fields?: readonly string[]
  loadRelation?: RuntimeLoadRelation
  getValue?: RuntimeGetValue
  query?: RuntimeQuery
}

export interface DeliveryAdapter<K extends DeliveryKind> {
  kind: K
  read(raw: Unread<DeliveryOf<K>>): DeliveryOf<K> | null
  needsTable: boolean
  fetchOn: 'never' | 'delivery' | 'selection'
  export(delivery: DeliveryOf<K>, source: DataSource, context: ExportContext): RuntimeEntry
  readExported(entry: Unread<RuntimeEntry>): RuntimeDeliveryOf<K> | null
  relationIds(delivery: DeliveryOf<K>): readonly string[]
  bindings(delivery: DeliveryOf<K>): readonly Parameter[]
  giverFields(delivery: DeliveryOf<K>): readonly string[]
}
