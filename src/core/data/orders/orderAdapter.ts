import type { SourceFacts } from '../sourceFacts'
import type { SheetPart } from './sheet'
import type { Unread } from '../../unread'

export type OrderedSource<O> = SourceFacts & { order: O }

// The field list of a source for the sheet, as the export computes it from
// what the mask uses; wildcard asks for '*' where the order allows it.
export type SheetFields<O> = (source: OrderedSource<O>, wildcard: boolean) => string

export interface OrderAdapter<O extends { kind: string }> {
  kind: O['kind']
  read(raw: Unread<O>): O | null
  needsTable: boolean
  sheet(sources: readonly OrderedSource<O>[], fields: SheetFields<O>): SheetPart
}
