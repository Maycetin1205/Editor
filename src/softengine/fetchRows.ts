import type { RuntimeSource } from '../core/data/dataSources'
import type { DeliveryKind } from '../core/data/deliveries/deliveries'
import type { RuntimeDeliveryOf } from '../core/data/deliveries/deliveryAdapter'
import { fetchQuerySource } from './queryLoader'
import { loadRowsPerRelation } from './relationLoader'
import { fetchValueSource } from './valueLoader'

type SourceWith<K extends DeliveryKind> = RuntimeSource & { delivery: RuntimeDeliveryOf<K> }

type Chosen = (giverId: string) => unknown

interface Fetch<K extends DeliveryKind> {
  run(source: SourceWith<K>, giverRow: unknown, chosen?: Chosen): Promise<void>
}

const FETCHES: { [K in DeliveryKind]: Fetch<K> } = {
  relationRows: { run: (source, giverRow) => loadRowsPerRelation(source, source.delivery.load, giverRow) },
  relationValue: { run: (source, _, chosen) => fetchValueSource(source, source.delivery.get, chosen) },
  message: { run: (source) => fetchQuerySource(source, source.delivery.query) },
  push: { run: () => Promise.resolve() },
}

function fetchOf(kind: DeliveryKind): Fetch<DeliveryKind> {
  return FETCHES[kind]
}

export function fetchRows(source: RuntimeSource, giverRow: unknown, chosen?: Chosen): Promise<void> {
  return fetchOf(source.delivery.kind).run(source, giverRow, chosen)
}
