import type { DataSource } from '../dataSources'
import type { Order, OrderKind } from './orders'
import type { SheetPart } from './sheet'
import type { Unread } from '../../unread'

type OrderOf<K extends OrderKind> = Order & { kind: K }

export type OrderedSource<K extends OrderKind> = DataSource & { order: OrderOf<K> }

type SheetFields = (source: DataSource, wildcard: boolean) => string

export interface OrderAdapter<K extends OrderKind> {
  kind: K
  read(raw: Unread<OrderOf<K>>): OrderOf<K> | null
  needsTable: boolean
  sheet(sources: readonly OrderedSource<K>[], fields: SheetFields): SheetPart
}
