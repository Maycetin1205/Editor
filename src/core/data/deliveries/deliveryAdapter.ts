import type { Parameter } from '../actions'
import type { RelationTemplate } from '../relations'
import type { SourceFacts } from '../sourceFacts'
import type { Unread } from '../../unread'

export interface ExportContext {
  usedFields: ReadonlySet<string> | undefined
  orderedFields: (source: SourceFacts) => string
  relations: readonly RelationTemplate[]
}

// The entry of a source in FF_DATA_SOURCES, as far as the deliveries fill it.
// Each delivery reads its own part back with readExported, hence unknown.
export interface RuntimeEntry {
  openRecord?: true
  fields?: readonly string[]
  loadRelation?: unknown
  getValue?: unknown
  query?: unknown
}

export interface DeliveryAdapter<D extends { kind: string }, R extends { kind: string }> {
  kind: D['kind']
  read(raw: Unread<D>): D | null
  needsTable: boolean
  fetchOn: 'never' | 'delivery' | 'selection'
  export(delivery: D, source: SourceFacts, context: ExportContext): RuntimeEntry
  readExported(entry: Unread<RuntimeEntry>): R | null
  relationIds(delivery: D): readonly string[]
  bindings(delivery: D): readonly Parameter[]
  giverFields(delivery: D): readonly string[]
}
