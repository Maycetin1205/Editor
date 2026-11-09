import { fixed, type ValueBinding } from './actions'
import { isRelationVerb, readRelations, type RelationData } from './relations'
import { sourceKind } from './sourceKinds'
import { guessFieldType, readSources, type SourceData, type SourceKindId } from './sources'

// The library: data sources and relations kept across masks. A mask holds
// copies of what it uses, so a mask file is complete on its own.

export const LIBRARY_KIND = 'aufbau-bibliothek'
const LEGACY_KIND = 'aufbau-editor-bibliothek'

export interface LibraryData {
  kind: typeof LIBRARY_KIND
  version: 1
  sources: SourceData[]
  relations: RelationData[]
}

export const EMPTY_LIBRARY: LibraryData = { kind: LIBRARY_KIND, version: 1, sources: [], relations: [] }

type Raw = Record<string, unknown>
const isRaw = (value: unknown): value is Raw => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const LEGACY_KINDS: Record<string, SourceKindId> = {
  idb: 'idb',
  addressMaster: 'file',
  itemMaster: 'file',
  document: 'file',
  documentItem: 'file',
  file: 'file',
  erpQuery: 'query',
  dataset: 'dataset',
  relationValue: 'relation',
  erpMask: 'erpMask',
}

function legacyBinding(raw: unknown): ValueBinding {
  if (!isRaw(raw)) return fixed('')
  const value = text(raw.value)
  if (raw.source === 'dataField' && text(raw.sourceId) !== '') return { from: 'field', source: text(raw.sourceId), field: value }
  if (raw.source === 'seVariable') return { from: 'variable', name: value }
  return fixed(raw.source === 'fixed' ? value : '')
}

// A source as the editor before the rebuild saved it.
function legacySource(raw: unknown): SourceData | null {
  if (!isRaw(raw)) return null
  const id = text(raw.id)
  const name = text(raw.name)
  const preset = text(raw.preset)
  if (id === '' || name === '' || !(preset in LEGACY_KINDS)) return null
  const order = isRaw(raw.order) ? raw.order : {}
  const delivery = isRaw(raw.delivery) ? raw.delivery : {}
  const write = isRaw(raw.write) ? raw.write : {}
  const openRecord = delivery.kind === 'push' && delivery.path === 'Var'
  const kind: SourceKindId = openRecord ? 'record' : LEGACY_KINDS[preset]
  const restriction = isRaw(delivery.restriction) ? delivery.restriction : {}
  const address = isRaw(restriction.address) ? restriction.address : null
  const fields = (Array.isArray(raw.fields) ? raw.fields : []).filter(isRaw).filter((f) => text(f.code) !== '')
  return {
    id,
    name,
    kind,
    table: text(raw.tableId),
    recordField: text(write.recordField),
    fields: fields.map((f) => ({
      code: text(f.code),
      name: text(f.name) || text(f.code),
      type: guessFieldType(text(f.name)),
    })),
    links: [],
    sample: [],
    ...(order.underHeader === true && text(order.headerKey) !== '' ? { headerKey: text(order.headerKey) } : {}),
    ...(text(order.area) !== '' ? { area: text(order.area) } : {}),
    ...(text(restriction.documentKind) !== '' ? { documentKind: text(restriction.documentKind) } : {}),
    ...(address && text(address.sourceId) !== ''
      ? { addressFrom: { source: text(address.sourceId), field: text(address.code) } }
      : {}),
    ...(kind === 'relation'
      ? {
          relation: text(delivery.relationId),
          params: (Array.isArray(delivery.parameter) ? delivery.parameter : []).map(legacyBinding),
        }
      : {}),
  }
}

function legacyRelation(raw: unknown): RelationData | null {
  if (!isRaw(raw)) return null
  const id = text(raw.id)
  if (id === '' || text(raw.name) === '' || !isRelationVerb(raw.verb) || text(raw.nr) === '') return null
  const params = (Array.isArray(raw.parameter) ? raw.parameter : [])
    .filter((p): p is string => typeof p === 'string')
    .map((p) => /^\{+([A-Za-z0-9_]+)\}+$/.exec(p)?.[1] ?? p)
  return { id, name: text(raw.name), verb: raw.verb, nr: text(raw.nr), params, extra: raw.extraParameterAllowed === true }
}

// Reads a library file, also one of the editor before the rebuild.
export function readLibrary(raw: unknown): LibraryData | null {
  if (!isRaw(raw)) return null
  if (raw.kind === LIBRARY_KIND) {
    return { kind: LIBRARY_KIND, version: 1, sources: readSources(raw.sources), relations: readRelations(raw.relations) }
  }
  if (raw.kind === LEGACY_KIND || Array.isArray(raw.dataSources) || Array.isArray(raw.relation)) {
    const sources = (Array.isArray(raw.dataSources) ? raw.dataSources : [])
      .map(legacySource)
      .filter((source): source is SourceData => source !== null)
      .map((source) => ({ ...source, table: sourceKind(source.kind).normalizeTable(source.table) || source.table }))
    const relations = (Array.isArray(raw.relation) ? raw.relation : [])
      .map(legacyRelation)
      .filter((relation): relation is RelationData => relation !== null)
    return { kind: LIBRARY_KIND, version: 1, sources, relations }
  }
  return null
}

export function parseLibrary(json: string): LibraryData | null {
  try {
    return readLibrary(JSON.parse(json))
  } catch {
    return null
  }
}

function merged<T extends { id: string }>(old: readonly T[], incoming: readonly T[]): { list: T[]; added: number } {
  const list = [...old]
  let added = 0
  for (const entry of incoming) {
    const at = list.findIndex((known) => known.id === entry.id)
    if (at < 0) {
      list.push(entry)
      added += 1
    } else {
      list[at] = entry
    }
  }
  return { list, added }
}

// Takes the entries of another library in; an entry with a known id replaces the old one.
export function mergeLibrary(
  base: LibraryData,
  incoming: Pick<LibraryData, 'sources' | 'relations'>,
): { library: LibraryData; added: number } {
  const sources = merged(base.sources, incoming.sources)
  const relations = merged(base.relations, incoming.relations)
  return {
    library: { ...base, sources: sources.list, relations: relations.list },
    added: sources.added + relations.added,
  }
}

// Relations this editor knows from the start.
export const STANDARD_RELATIONS: readonly RelationData[] = [
  {
    id: 'rel_std_174',
    name: 'IDB-Feld schreiben',
    verb: 'PUT_RELATION',
    nr: '174',
    params: ['Position', 'Länge', 'Feldart', 'Satznummer', 'IDB', 'Wert'],
    extra: false,
  },
  { id: 'rel_std_640', name: 'IDB-Satz anlegen', verb: 'GET_RELATION', nr: '640', params: ['IDB'], extra: false },
]
