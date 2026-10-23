import type { OrderAdapter } from './orderAdapter'

export interface NoOrder {
  kind: 'none'
}

export const noOrder: OrderAdapter<'none'> = {
  kind: 'none',
  read: () => ({ kind: 'none' }),
  needsTable: false,
  sheet: () => ({}),
}
