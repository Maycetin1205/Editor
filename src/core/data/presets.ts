import type { Order } from './orders'
import type { Delivery } from './deliveries/deliveries'
import { WITHOUT_RESTRICTION, type QueryRestriction, restricts } from './deliveries/message'
import type { LoadRelation } from './deliveries/relationRows'
import type { GetValue } from './deliveries/relationValue'
import type { Write } from './writes'
import { keyFromInput } from './sourceInput'

export interface SourceChoice {
  headerKey: string
  area: string
  openRecord: boolean
  load: LoadRelation | null
  getValue: GetValue
  recordField: string
  restriction: QueryRestriction
}

export const EMPTY_CHOICE: SourceChoice = {
  headerKey: '',
  area: '',
  openRecord: false,
  load: null,
  getValue: { relationId: '', parameter: [] },
  recordField: '',
  restriction: WITHOUT_RESTRICTION,
}

interface OrderAndDelivery {
  order: Order
  delivery: Delivery
}

interface SourceDescriptor extends OrderAndDelivery {
  write: Write
}

interface SourcePreset<P extends string> {
  id: P
  name: string
  keyLabel: string
  columnsLabel: string
  tableId: string
  key(raw: string): string
  prefixed: boolean
  list(choice: SourceChoice): OrderAndDelivery
  openRecord?: OrderAndDelivery
  fetches: boolean
  writes: boolean
}

export function descriptorFor<P extends string>(preset: SourcePreset<P>, choice: SourceChoice): SourceDescriptor {
  const recordField = choice.recordField.trim()
  const write: Write = preset.writes && recordField !== '' ? { kind: 'putRelation', recordField } : { kind: 'none' }
  if (preset.fetches && choice.load) {
    return { order: { kind: 'none' }, delivery: { kind: 'relationRows', ...choice.load }, write }
  }
  if (preset.openRecord && choice.openRecord) return { ...preset.openRecord, write }
  return { ...preset.list(choice), write }
}

const idb: SourcePreset<'idb'> = {
  id: 'idb',
  name: 'IDB-Tabelle',
  keyLabel: 'Kennung',
  columnsLabel: '',
  tableId: '',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: () => ({
    order: { kind: 'sefileloop', wildcard: true, underHeader: false, headerKey: '' },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  fetches: false,
  writes: true,
}

const addressMaster: SourcePreset<'addressMaster'> = {
  id: 'addressMaster',
  name: 'Adressstamm',
  keyLabel: '',
  columnsLabel: '',
  tableId: 'ADR',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: () => ({
    order: { kind: 'sefileloop', wildcard: false, underHeader: false, headerKey: '' },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  openRecord: { order: { kind: 'var' }, delivery: { kind: 'push', path: 'Var' } },
  fetches: false,
  writes: true,
}

const itemMaster: SourcePreset<'itemMaster'> = {
  id: 'itemMaster',
  name: 'Artikelstamm',
  keyLabel: '',
  columnsLabel: '',
  tableId: 'ART',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: () => ({
    order: { kind: 'sefileloop', wildcard: false, underHeader: false, headerKey: '' },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  fetches: false,
  writes: true,
}

const document: SourcePreset<'document'> = {
  id: 'document',
  name: 'Beleg',
  keyLabel: '',
  columnsLabel: '',
  tableId: 'BEL',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: () => ({
    order: { kind: 'sefileloop', wildcard: false, underHeader: false, headerKey: '' },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  openRecord: { order: { kind: 'var' }, delivery: { kind: 'push', path: 'Var' } },
  fetches: false,
  writes: true,
}

const documentItem: SourcePreset<'documentItem'> = {
  id: 'documentItem',
  name: 'Belegpositionen',
  keyLabel: '',
  columnsLabel: '',
  tableId: 'POS',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: (choice) => ({
    order: { kind: 'sefileloop', wildcard: false, underHeader: true, headerKey: choice.headerKey },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  openRecord: { order: { kind: 'var' }, delivery: { kind: 'push', path: 'Var' } },
  fetches: true,
  writes: true,
}

const file: SourcePreset<'file'> = {
  id: 'file',
  name: 'Andere Datei',
  keyLabel: 'Kennung',
  columnsLabel: '',
  tableId: '',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: (choice) => ({
    order: { kind: 'sefileloop', wildcard: false, underHeader: true, headerKey: choice.headerKey },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  fetches: false,
  writes: true,
}

const erpQuery: SourcePreset<'erpQuery'> = {
  id: 'erpQuery',
  name: 'ERP-Abfrage',
  keyLabel: 'Kennung',
  columnsLabel: '',
  tableId: '',
  key: (raw) => keyFromInput(raw, true),
  prefixed: true,
  list: (choice) => ({
    order: { kind: 'none' },
    delivery: { kind: 'message', ...(restricts(choice.restriction) ? { restriction: choice.restriction } : {}) },
  }),
  fetches: false,
  writes: true,
}

const dataset: SourcePreset<'dataset'> = {
  id: 'dataset',
  name: 'DataSet',
  keyLabel: 'DataSet-ID',
  columnsLabel: 'Spalte im DataSet',
  tableId: '',
  key: (raw) => keyFromInput(raw, false),
  prefixed: false,
  list: () => ({ order: { kind: 'dataset' }, delivery: { kind: 'push', path: 'Tabellen' } }),
  fetches: false,
  writes: false,
}

const relationValue: SourcePreset<'relationValue'> = {
  id: 'relationValue',
  name: 'Wert per Relation',
  keyLabel: '',
  columnsLabel: 'Name in der Antwort',
  tableId: '',
  key: (raw) => keyFromInput(raw, false),
  prefixed: false,
  list: (choice) => ({
    order: { kind: 'none' },
    delivery: { kind: 'relationValue', ...choice.getValue },
  }),
  fetches: false,
  writes: false,
}

const erpMask: SourcePreset<'erpMask'> = {
  id: 'erpMask',
  name: 'ERP-Maske',
  keyLabel: 'Maskennummer',
  columnsLabel: '',
  tableId: '',
  key: (raw) => keyFromInput(raw, false),
  prefixed: true,
  list: (choice) => ({ order: { kind: 'mask', area: choice.area }, delivery: { kind: 'push', path: 'Masken' } }),
  fetches: false,
  writes: false,
}

const PRESETS = {
  idb,
  addressMaster,
  itemMaster,
  document,
  documentItem,
  file,
  erpQuery,
  dataset,
  relationValue,
  erpMask,
} satisfies Record<string, SourcePreset<string>>

export type PresetId = keyof typeof PRESETS

export const PRESET_IDS: readonly PresetId[] = Object.values(PRESETS).map((p) => p.id)

export function sourcePreset(id: PresetId): SourcePreset<PresetId> {
  return PRESETS[id]
}

export function isPresetId(id: unknown): id is PresetId {
  return typeof id === 'string' && (PRESET_IDS as readonly string[]).includes(id)
}
