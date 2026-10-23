import type { OrderAdapter } from './orderAdapter'
import { withoutTablePrefix } from './sheet'

export interface VarOrder {
  kind: 'var'
}

export const varOrder: OrderAdapter<'var'> = {
  kind: 'var',
  read: () => ({ kind: 'var' }),
  needsTable: true,
  sheet: (sources, fields) => ({
    VAR: sources.map((s) => ({ ID: s.tableId, FELDER: withoutTablePrefix(fields(s, false), s.tableId) })),
  }),
}
