import type { OrderAdapter } from './orderAdapter'

export interface MaskOrder {
  kind: 'mask'
  area: string
}

export const mask: OrderAdapter<MaskOrder> = {
  kind: 'mask',
  read(raw) {
    const area = typeof raw.area === 'string' ? raw.area.trim().toUpperCase() : ''
    return area === '' ? null : { kind: 'mask', area }
  },
  needsTable: true,
  sheet: (sources) => ({
    MASKE: sources.map((s) => ({
      ID: s.tableId,
      BEREICH: s.order.area,
      FELDER: '*',
      REFRESH_FELDER: '*',
      ALIAS: s.name,
    })),
  }),
}
