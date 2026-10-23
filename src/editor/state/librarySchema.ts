import { checkLoadRelation } from '../../core/data/deliveries/relationRows'
import { checkGetValue } from '../../core/data/deliveries/relationValue'
import { isPresetId, sourcePreset } from '../../core/data/presets/presets'
import { EMPTY_CHOICE, descriptorFor } from '../../core/data/presets/sourcePreset'
import { OLD_POSITIONS_PARAMETER, OLD_POSITIONS_SLOTS } from '../../core/data/relations'

export const LIBRARY_SCHEMA_VERSION = 2

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function to(o: Record<string, unknown>, pairs: Record<string, string>): void {
  for (const [old, next] of Object.entries(pairs)) {
    if (old in o && !(next in o)) {
      o[next] = o[old]
      delete o[old]
    }
  }
}

function liftV9Keys(x: unknown): void {
  if (Array.isArray(x)) {
    x.forEach(liftV9Keys)
    return
  }
  if (!isPlainObject(x)) return
  if ('childIds' in x)
    to(x, { type: 'typ', props: 'werte', events: 'ketten', parentId: 'elternId', childIds: 'kinderIds' })
  if ('resultKey' in x)
    to(x, {
      type: 'art',
      resultKey: 'ergebnisName',
      params: 'parameter',
      extraParams: 'zusatzParameter',
      toolParams: 'toolParameter',
    })
  if ('source' in x && 'value' in x && !('id' in x))
    to(x, { source: 'quelle', value: 'wert', dataSourceId: 'quelleId', blockId: 'bausteinId' })
  if ('kind' in x && 'fields' in x) to(x, { kind: 'art', fields: 'felder', indexField: 'satzFeld' })
  if ('code' in x && 'label' in x) to(x, { label: 'name' })
  if ('verb' in x && 'params' in x) to(x, { params: 'parameter', allowExtraParams: 'zusatzParameterErlaubt' })
  if ('relationId' in x && 'params' in x) to(x, { params: 'parameter' })
  if ('fromField' in x) to(x, { fromField: 'vonFeld', toField: 'nachFeld' })
  if ('keyPairs' in x) to(x, { keyPairs: 'paare' })
  for (const value of Object.values(x)) liftV9Keys(value)
}

function liftKey<T>(raw: T): T {
  const copy = JSON.parse(JSON.stringify(raw)) as T
  liftV9Keys(copy)
  return copy
}

const PARAMETER_KEYS: Record<string, string> = {
  quelle: 'source',
  wert: 'value',
  bausteinId: 'blockId',
  quelleId: 'sourceId',
  ergebnisFeld: 'resultField',
}

const PARAMETER_SOURCES: Record<string, string> = {
  erfassungszelle: 'captureCell',
  aenderungszelle: 'changeCell',
  loeschzelle: 'deleteCell',
  gewaehlte_zeile: 'chosenRow',
  se_variable: 'seVariable',
  datenfeld: 'dataField',
  aus: 'from',
}

const SOURCE_KEYS: Record<string, string> = {
  art: 'kind',
  felder: 'fields',
  satzFeld: 'recordField',
  kopfsatzIndex: 'headerKeyIndex',
  lieferung: 'delivery',
  ladeRelation: 'loadRelation',
  holWert: 'getValue',
  feldVorsatz: 'fieldPrefix',
  bereich: 'area',
  zeichen: 'icon',
  belegartFeld: 'documentKindField',
  belegnummerFeld: 'documentNumberField',
  jahrFeld: 'yearField',
  archivFeld: 'archiveField',
  endeFelder: 'endFields',
  zusatzParameterErlaubt: 'extraParameterAllowed',
  offenerSatz: 'openRecord',
}

const SOURCE_KINDS: Record<string, string> = {
  adressstamm: 'addressMaster',
  artikelstamm: 'itemMaster',
  beleg: 'document',
  belegposition: 'documentItem',
  datei: 'file',
  relationswert: 'relationValue',
  erpabfrage: 'erpQuery',
  erpmaske: 'erpMask',
}

const DELIVERY_VALUES: Record<string, string> = { liste: 'list', offenerSatz: 'openRecord' }

function renameDeep(x: unknown, pairs: Record<string, string>): void {
  if (Array.isArray(x)) {
    x.forEach((e) => renameDeep(e, pairs))
    return
  }
  if (!isPlainObject(x)) return
  to(x, pairs)
  for (const value of Object.values(x)) renameDeep(value, pairs)
}

function liftParameters(params: unknown): void {
  if (!Array.isArray(params)) return
  for (const p of params) {
    if (!isPlainObject(p)) continue
    to(p, PARAMETER_KEYS)
    const from = p.source
    if (typeof from === 'string' && from in PARAMETER_SOURCES) p.source = PARAMETER_SOURCES[from]
  }
}

function liftLibraries(state: Record<string, unknown>): void {
  const sources = state.datenquellen ?? state.dataSources
  if (Array.isArray(sources)) {
    renameDeep(sources, SOURCE_KEYS)
    for (const source of sources) {
      if (!isPlainObject(source)) continue
      const kind = source.kind
      if (typeof kind === 'string' && kind in SOURCE_KINDS) source.kind = SOURCE_KINDS[kind]
      const delivery = source.delivery
      if (typeof delivery === 'string' && delivery in DELIVERY_VALUES) source.delivery = DELIVERY_VALUES[delivery]
      if (isPlainObject(source.getValue)) liftParameters(source.getValue.parameter)
    }
  }
  const relations = state.relationen ?? state.relations ?? state.relation
  if (Array.isArray(relations)) renameDeep(relations, SOURCE_KEYS)
  to(state, { datenquellen: 'dataSources', relationen: 'relation', relations: 'relation' })
}

const PARAMETER_SOURCES_19: Record<string, string> = {
  from: 'omitted',
  previous_result: 'previousResult',
  step_result: 'stepResult',
  block_value: 'blockValue',
  data_field: 'dataField',
}

const FIELD_KEYS_19: Record<string, string> = { icon: 'length' }

function word(o: Record<string, unknown>, key: string, table: Record<string, string>): void {
  const held = o[key]
  if (typeof held === 'string' && Object.hasOwn(table, held)) o[key] = table[held]
}

function liftParameterNames(params: unknown): void {
  if (!Array.isArray(params)) return
  for (const p of params) {
    if (isPlainObject(p)) word(p, 'source', PARAMETER_SOURCES_19)
  }
}

function liftSourceNames(state: Record<string, unknown>): void {
  const sources = state.dataSources
  if (!Array.isArray(sources)) return
  for (const source of sources) {
    if (!isPlainObject(source)) continue
    if (Array.isArray(source.fields)) renameDeep(source.fields, FIELD_KEYS_19)
    if (isPlainObject(source.getValue)) liftParameterNames(source.getValue.parameter)
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function descriptorSource(source: Record<string, unknown>): Record<string, unknown> {
  if ('preset' in source || !isPresetId(source.kind)) return source
  const { kind, idbId, recordField, headerKeyIndex, delivery, loadRelation, getValue, area, ...kept } = source
  const preset = sourcePreset(kind)
  return {
    ...kept,
    preset: kind,
    tableId: preset.tableId !== '' ? preset.tableId : text(idbId),
    ...descriptorFor(preset, {
      headerKey: text(headerKeyIndex),
      area: text(area),
      openRecord: delivery === 'openRecord',
      load: checkLoadRelation(loadRelation),
      getValue: checkGetValue(getValue) ?? EMPTY_CHOICE.getValue,
      recordField: kind === 'erpQuery' ? '' : text(recordField),
      restriction: EMPTY_CHOICE.restriction,
    }),
  }
}

function liftToDescriptors(state: Record<string, unknown>): void {
  const sources = state.dataSources
  if (!Array.isArray(sources)) return
  state.dataSources = sources.map((source) => (isPlainObject(source) ? descriptorSource(source) : source))
}

const OLD_ANSWER_LENGTH = 255

function positionEntryFor(nr: string, relations: unknown[]): string {
  const present = relations.find(
    (r) =>
      isPlainObject(r) &&
      r.verb === 'GET_RELATION' &&
      r.nr === nr &&
      isPlainObject(r.positions) &&
      typeof r.id === 'string',
  )
  if (isPlainObject(present) && typeof present.id === 'string') return present.id
  let id = `positions-${nr}`
  for (let n = 2; relations.some((r) => isPlainObject(r) && r.id === id); n++) id = `positions-${nr}-${n}`
  relations.push({
    id,
    name: `Positionen holen (Relation ${nr})`,
    verb: 'GET_RELATION',
    nr,
    parameter: [...OLD_POSITIONS_PARAMETER],
    positions: { slots: [...OLD_POSITIONS_SLOTS], answerLength: OLD_ANSWER_LENGTH },
  })
  return id
}

function liftLoadRelations(state: Record<string, unknown>): void {
  const sources = state.dataSources
  if (!Array.isArray(sources)) return
  const relations: unknown[] = Array.isArray(state.relation) ? state.relation : []
  for (const source of sources) {
    if (!isPlainObject(source)) continue
    const delivery = source.delivery
    const load = isPlainObject(source.loadRelation)
      ? source.loadRelation
      : isPlainObject(delivery) && delivery.kind === 'relationRows'
        ? delivery
        : null
    if (!load || typeof load.nr !== 'string' || 'relationId' in load) continue
    const nr = load.nr.trim()
    if (!/^\d+$/.test(nr) || !checkLoadRelation({ ...load, relationId: nr })) continue
    load.relationId = positionEntryFor(nr, relations)
    delete load.nr
  }
  if (relations.length > 0) state.relation = relations
}

function liftTo20(state: Record<string, unknown>): void {
  liftLoadRelations(state)
  liftToDescriptors(state)
}

export function liftLibrary(raw: Record<string, unknown>): Record<string, unknown> {
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0
  if (version >= LIBRARY_SCHEMA_VERSION) return raw
  const o = version < 1 ? liftKey(raw) : raw
  if (version < 1) {
    liftLibraries(o)
    liftSourceNames(o)
  }
  liftTo20(o)
  return o
}
