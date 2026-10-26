import type { OrderAdapter } from './orderAdapter'
import { noOrder, type NoOrder } from './none'
import { sefileloop, type SefileloopOrder } from './sefileloop'
import { varOrder, type VarOrder } from './var'
import { erpApiCall, type ErpApiCallOrder } from './erpapicall'
import { dataset, type DatasetOrder } from './dataset'
import { mask, type MaskOrder } from './mask'

export type Order = NoOrder | SefileloopOrder | VarOrder | ErpApiCallOrder | DatasetOrder | MaskOrder

export type OrderKind = Order['kind']

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
