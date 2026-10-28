import type { SourceFacts } from './sourceFacts'
import { type SheetPart, withoutTablePrefix, type VarEntry } from './sheet'
import type { Unread } from '../unread'

type OrderedSource<O> = SourceFacts & { order: O }

// The field list of a source for the sheet, as the export computes it from
// what the mask uses; wildcard asks for '*' where the order allows it.
type SheetFields<O> = (source: OrderedSource<O>, wildcard: boolean) => string

interface OrderAdapter<O extends { kind: string }> {
  kind: O['kind']
  read(raw: Unread<O>): O | null
  needsTable: boolean
  sheet(sources: readonly OrderedSource<O>[], fields: SheetFields<O>): SheetPart
}

export interface NoOrder {
  kind: 'none'
}

const noOrder: OrderAdapter<NoOrder> = {
  kind: 'none',
  read: () => ({ kind: 'none' }),
  needsTable: false,
  sheet: () => ({}),
}

export interface SefileloopOrder {
  kind: 'sefileloop'
  wildcard: boolean
  underHeader: boolean
  headerKey: string
}

const HEADER_KEY = /^([A-Za-z][A-Za-z0-9]*)_(\d+_\d+)$/

function headerKeyOf(source: OrderedSource<SefileloopOrder>): string {
  return source.order.underHeader ? source.order.headerKey.trim() : ''
}

function varOfHeaderKey(source: OrderedSource<SefileloopOrder>): VarEntry[] {
  const parts = HEADER_KEY.exec(headerKeyOf(source))
  return parts ? [{ ID: parts[1], FELDER: parts[2] }] : []
}

const sefileloop: OrderAdapter<SefileloopOrder> = {
  kind: 'sefileloop',
  read(raw) {
    const underHeader = raw.underHeader === true
    return {
      kind: 'sefileloop',
      wildcard: raw.wildcard === true,
      underHeader,
      headerKey: underHeader && typeof raw.headerKey === 'string' ? raw.headerKey.trim() : '',
    }
  },
  needsTable: true,
  sheet(sources, fields) {
    const ordered = [...sources.filter((s) => !s.order.underHeader), ...sources.filter((s) => s.order.underHeader)]
    return {
      SEFILELOOP: ordered.map((s) => {
        const headerKey = headerKeyOf(s)
        return {
          INDEX_NR: 0,
          ALIAS: s.name,
          ID: s.tableId,
          ...(headerKey !== '' ? { KOPFSATZ_INDEX: headerKey } : {}),
          FELDER: withoutTablePrefix(fields(s, s.order.wildcard), s.tableId),
        }
      }),
      VAR: ordered.flatMap(varOfHeaderKey),
    }
  },
}

export interface VarOrder {
  kind: 'var'
}

const varOrder: OrderAdapter<VarOrder> = {
  kind: 'var',
  read: () => ({ kind: 'var' }),
  needsTable: true,
  sheet: (sources, fields) => ({
    VAR: sources.map((s) => ({ ID: s.tableId, FELDER: withoutTablePrefix(fields(s, false), s.tableId) })),
  }),
}

export interface ErpApiCallOrder {
  kind: 'erpapicall'
}

const erpApiCall: OrderAdapter<ErpApiCallOrder> = {
  kind: 'erpapicall',
  read: () => ({ kind: 'erpapicall' }),
  needsTable: true,
  sheet: (sources, fields) => ({
    ERPAPICALL: sources.map((s) => ({ ID: s.tableId, ALIAS: s.name, FELDER: fields(s, false) })),
  }),
}

export interface DatasetOrder {
  kind: 'dataset'
}

const dataset: OrderAdapter<DatasetOrder> = {
  kind: 'dataset',
  read: () => ({ kind: 'dataset' }),
  needsTable: true,
  sheet: (sources, fields) => ({
    DATASET: sources.map((s) => ({ ID: s.tableId, ALIAS: s.name, FELDER: fields(s, false) })),
  }),
}

export interface MaskOrder {
  kind: 'mask'
  area: string
}

const mask: OrderAdapter<MaskOrder> = {
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

export type Order = NoOrder | SefileloopOrder | VarOrder | ErpApiCallOrder | DatasetOrder | MaskOrder

type OrderKind = Order['kind']

const ORDER_ADAPTERS: { [K in OrderKind]: OrderAdapter<Order & { kind: K }> } = {
  none: noOrder,
  sefileloop,
  var: varOrder,
  erpapicall: erpApiCall,
  dataset,
  mask,
}

export const ORDER_KINDS: readonly OrderKind[] = Object.values(ORDER_ADAPTERS).map((a) => a.kind)

export function orderAdapter(kind: OrderKind): OrderAdapter<Order> {
  return ORDER_ADAPTERS[kind]
}

export function isOrderKind(kind: string): kind is OrderKind {
  return (ORDER_KINDS as readonly string[]).includes(kind)
}
