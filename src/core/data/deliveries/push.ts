import { withoutTablePrefix } from '../orders/sheet'
import type { DeliveryAdapter } from './deliveryAdapter'

const PUSH_PATHS = ['SEFileLoop', 'Var', 'Tabellen', 'Masken', 'ErpApiCall'] as const

type PushPath = (typeof PUSH_PATHS)[number]

export interface PushDelivery {
  kind: 'push'
  path: PushPath
}

export interface RuntimePushDelivery {
  kind: 'push'
  openRecord: boolean
}

function isPushPath(value: unknown): value is PushPath {
  return typeof value === 'string' && (PUSH_PATHS as readonly string[]).includes(value)
}

export const push: DeliveryAdapter<PushDelivery, RuntimePushDelivery> = {
  kind: 'push',
  read: (raw) => (isPushPath(raw.path) ? { kind: 'push', path: raw.path } : null),
  needsTable: false,
  fetchOn: 'never',
  export: (delivery, source, context) => ({
    ...(delivery.path === 'Var' ? { openRecord: true } : {}),
    fields: withoutTablePrefix(context.orderedFields(source), source.tableId)
      .split(',')
      .filter((code) => code !== ''),
  }),
  readExported: (entry) => ({ kind: 'push', openRecord: entry.openRecord === true }),
  relationIds: () => [],
  bindings: () => [],
  giverFields: () => [],
}
