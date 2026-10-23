import { SOURCES_DIVIDER } from '../../core/block/blockType'
import { aliasOf, choiceOf, keyDisplay, LENGTH_MAX, type DataField, type DataSource } from '../../core/data/dataSources'
import { sourcePreset, type PresetId } from '../../core/data/presets/presets'
import { EMPTY_CHOICE, descriptorFor, type SourceChoice } from '../../core/data/presets/sourcePreset'
import { POSITIONS_RELATION, relationSyntaxAsText, type RelationTemplate } from '../../core/data/relations'
import { keyFromInput } from '../../core/data/sourceInput'
import type { Write } from '../../core/data/writes/writes'

export type SourceData = Omit<DataSource, 'id'>

interface Kind {
  preset: PresetId
  tableId: string
}

const POSITIONS_UNDER = 'BEL_0_11'

const TABLE_KINDS: Readonly<Record<string, PresetId>> = {
  BEL: 'document',
  POS: 'documentItem',
  ADR: 'addressMaster',
  ART: 'itemMaster',
}
const BY_TABLE = new Set<PresetId>(['document', 'documentItem', 'addressMaster', 'itemMaster', 'idb', 'file'])
const IDB = /^(?:IDB)?(?:ID)?(\d{1,4})$/

export function tableKind(raw: string, current?: DataSource): Kind | null {
  const t = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (current && !BY_TABLE.has(current.preset)) {
    const preset = sourcePreset(current.preset)
    if (preset.keyLabel === '') return { preset: current.preset, tableId: preset.tableId }
    const key = preset.key(raw)
    return key === '' ? null : { preset: current.preset, tableId: key }
  }
  if (t === '') return null
  const fixed = TABLE_KINDS[t]
  if (fixed) return { preset: fixed, tableId: t }
  const idb = IDB.exec(t)
  if (idb) return { preset: 'idb', tableId: `IDBID${idb[1].padStart(4, '0')}` }
  const key = keyFromInput(t, false)
  return key === '' ? null : { preset: 'file', tableId: key }
}

export const tableText = (s: DataSource): string => keyDisplay(s.tableId)

export const nameTaken = (sources: readonly DataSource[], name: string, except?: string): boolean =>
  sources.some((s) => s.id !== except && aliasOf(s.name) === aliasOf(name))

function writeFor(preset: PresetId, fields: readonly DataField[], before: Write): Write {
  if (!sourcePreset(preset).writes) return { kind: 'none' }
  const named = fields.find((f) => aliasOf(f.name) === 'satznummer')
  if (named) return { kind: 'putRelation', recordField: named.code }
  if (before.kind === 'putRelation' && fields.some((f) => f.code === before.recordField)) return before
  return before.kind === 'putRelation' && fields.length === 0 ? before : { kind: 'none' }
}

function described(preset: PresetId, choice: SourceChoice, fields: readonly DataField[], before: Write) {
  const c = preset === 'documentItem' && choice.headerKey === '' ? { ...choice, headerKey: POSITIONS_UNDER } : choice
  const { order, delivery } = descriptorFor(sourcePreset(preset), c)
  return { order, delivery, write: writeFor(preset, fields, before) }
}

export function newSource(name: string, kind: Kind, fields: readonly DataField[] = []): SourceData {
  return {
    name: name.trim(),
    ...kind,
    ...described(kind.preset, EMPTY_CHOICE, fields, { kind: 'none' }),
    fields,
  }
}

const without = (s: DataSource): SourceData => {
  const { id: _id, ...rest } = s
  void _id
  return rest
}

export function withEntry(
  s: DataSource,
  change: { name?: string; table?: string; fields?: readonly DataField[] },
): SourceData | null {
  const kind = change.table === undefined ? { preset: s.preset, tableId: s.tableId } : tableKind(change.table, s)
  if (!kind) return null
  const fields = change.fields ?? s.fields
  const name = change.name?.trim() ?? s.name
  if (kind.preset === s.preset) {
    return { ...without(s), name, tableId: kind.tableId, fields, write: writeFor(s.preset, fields, s.write) }
  }
  const choice = { ...choiceOf(s), headerKey: '', openRecord: false, load: null }
  return { ...without(s), name, ...kind, ...described(kind.preset, choice, fields, s.write), fields }
}

export function withSettings(
  s: DataSource,
  change: {
    choice?: Partial<SourceChoice>
    fieldPrefix?: string
    fields?: readonly DataField[]
  },
): SourceData {
  return withKind(s, s.preset, s.tableId, change)
}

function withKind(
  s: DataSource,
  preset: PresetId,
  tableId: string,
  change: {
    choice?: Partial<SourceChoice>
    fieldPrefix?: string
    fields?: readonly DataField[]
  },
): SourceData {
  const fields = change.fields ?? s.fields
  const prefix = change.fieldPrefix ?? s.fieldPrefix ?? ''
  const { fieldPrefix: _prefix, ...rest } = without(s)
  void _prefix
  return {
    ...rest,
    preset,
    tableId,
    ...described(preset, { ...choiceOf(s), ...change.choice }, fields, s.write),
    fields,
    ...(prefix !== '' ? { fieldPrefix: prefix } : {}),
  }
}

export function withPreset(s: DataSource, preset: PresetId): SourceData {
  const p = sourcePreset(preset)
  const tableId = p.tableId !== '' ? p.tableId : p.keyLabel !== '' ? p.key(keyDisplay(s.tableId)) || s.tableId : ''
  const headerKey = preset === 'documentItem' ? POSITIONS_UNDER : choiceOf(s).headerKey
  return withKind(s, preset, tableId, { choice: { headerKey, openRecord: false, load: null } })
}

export function deliveries(s: DataSource, relations: readonly RelationTemplate[]): { value: string; name: string }[] {
  const preset = sourcePreset(s.preset)
  return [
    { value: 'list', name: 'alle Sätze beim Öffnen' },
    ...(preset.openRecord !== undefined ? [{ value: 'open', name: 'den offenen Satz' }] : []),
    ...(preset.fetches ? fetchingEntries(relations, choiceOf(s).load?.relationId ?? '') : []),
  ]
}

export const NEW_POSITIONS = 'get:'

function fetchingEntries(relations: readonly RelationTemplate[], chosenId: string): { value: string; name: string }[] {
  const fetching = relations.filter((r) => r.positions !== undefined)
  if (fetching.length === 0) return [{ value: NEW_POSITIONS, name: `per GET: ${POSITIONS_RELATION.name}` }]
  return oncePerRelation(fetching, chosenId).map((r) => ({ value: `get:${r.id}`, name: `per GET: ${r.name}` }))
}

export function oncePerRelation(relations: readonly RelationTemplate[], chosenId: string): RelationTemplate[] {
  const once = new Map<string, RelationTemplate>()
  for (const r of relations) {
    const key = `${r.name}\n${relationSyntaxAsText(r)}`
    if (!once.has(key) || r.id === chosenId) once.set(key, r)
  }
  return [...once.values()]
}

export function deliveryOf(s: DataSource): string {
  const choice = choiceOf(s)
  return choice.load ? `get:${choice.load.relationId}` : choice.openRecord ? 'open' : 'list'
}

export function withDelivery(s: DataSource, value: string): SourceData {
  if (!value.startsWith('get:')) return withSettings(s, { choice: { openRecord: value === 'open', load: null } })
  const keep = choiceOf(s).load
  return withSettings(s, {
    choice: {
      openRecord: false,
      load: {
        relationId: value.slice('get:'.length),
        documentKindField: keep?.documentKindField ?? '2_1',
        documentNumberField: keep?.documentNumberField ?? '3_8',
        yearField: keep?.yearField ?? '0_1',
        archiveField: keep?.archiveField ?? '1_1',
        endFields: keep?.endFields ?? ['11_6', '18_25'],
      },
    },
  })
}

export const codeReads = (code: string): boolean =>
  code.trim() !== '' && !code.includes(',') && !code.includes(SOURCES_DIVIDER)

export const lengthReads = (raw: string): boolean => {
  const t = raw.trim()
  if (t === '') return true
  const n = Number(t)
  return Number.isInteger(n) && n >= 1 && n <= LENGTH_MAX
}

export function fieldFrom(code: string, name: string, length: string): DataField {
  const t = length.trim()
  return { code: code.trim(), name: name.trim(), ...(t === '' ? {} : { length: Number(t) }) }
}
