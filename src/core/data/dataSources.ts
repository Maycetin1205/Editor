import { SOURCES_DIVIDER } from '../block/blockType'
import { isUnread } from '../unread'
import { deliveryAdapter, isDeliveryKind, type Delivery, type RuntimeDelivery } from './deliveries/deliveries'
import { isOrderKind, orderAdapter, type Order } from './orders'
import { isPresetId, sourcePreset, type PresetId, EMPTY_CHOICE, type SourceChoice } from './presets'
import { POS_LEN, keyDisplay } from './sourceInput'
import type { DataField, SourceFacts } from './sourceFacts'
import { isWriteKind, recordFieldOf, writeAdapter, type Write } from './writes'

export { fieldPrefixFromInput, keyDisplay } from './sourceInput'

export const LENGTH_MAX = 200

export type { DataField } from './sourceFacts'

export interface DataSource extends SourceFacts {
  preset: PresetId

  order: Order

  delivery: Delivery

  write: Write

  fieldPrefix?: string

  // The tab of the data window the user put the source in; unset, the table decides.
  folder?: string
}

export interface RuntimeSource {
  id: string
  name: string
  tableId: string
  recordField: string

  fields: readonly string[]

  delivery: RuntimeDelivery
}

export function fieldOf(source: DataSource | undefined, code: string): DataField | undefined {
  return code === '' ? undefined : source?.fields.find((f) => f.code === code)
}

export function recordNumberOf(source: DataSource): string {
  return recordFieldOf(source.write)
}

export function sourcesKey(source: Pick<DataSource, 'tableId'>): string {
  return keyDisplay(source.tableId)
}

export function aliasOf(name: string): string {
  return name.trim().toLowerCase()
}

export function withUniqueNames(sources: readonly DataSource[]): DataSource[] {
  const taken = new Set<string>()
  return sources.map((s) => {
    let name = s.name
    for (let n = 2; taken.has(aliasOf(name)); n++) name = `${s.name.trim()} ${n}`
    taken.add(aliasOf(name))
    return name === s.name ? s : { ...s, name }
  })
}

export function orderedFields(
  source: DataSource,
  used: ReadonlySet<string> | undefined,
  getKey: readonly string[],
  wildcard: boolean,
): string {
  const withKeys = (codes: string[]): string[] => {
    for (const code of getKey) {
      if (!codes.includes(code)) codes.push(code)
    }
    return codes
  }

  const onlyUsed = (front: readonly string[], read: ReadonlySet<string>): string[] => {
    const codes = [...front]
    for (const f of source.fields) {
      if (read.has(f.code) && !codes.includes(f.code)) codes.push(f.code)
    }
    for (const code of read) {
      if (!codes.includes(code)) codes.push(code)
    }
    return withKeys(codes)
  }

  const index = recordNumberOf(source)
  const front = index === '' ? [] : [index]

  if (!wildcard) {
    if (!used || used.size === 0) {
      return withKeys(source.fields.map((f) => f.code)).join(',')
    }
    return onlyUsed(front, used).join(',')
  }

  if (!used || used.size === 0) return '*'

  const codes = onlyUsed(front, used)

  return codes.every((code) => POS_LEN.test(code)) ? codes.join(',') : '*'
}

export function choiceOf(source: DataSource): SourceChoice {
  const { order, delivery, write } = source
  return {
    headerKey: order.kind === 'sefileloop' ? order.headerKey : '',
    area: order.kind === 'mask' ? order.area : '',
    openRecord: delivery.kind === 'push' && delivery.path === 'Var',
    load:
      delivery.kind === 'relationRows'
        ? {
            relationId: delivery.relationId,
            documentKindField: delivery.documentKindField,
            documentNumberField: delivery.documentNumberField,
            yearField: delivery.yearField,
            archiveField: delivery.archiveField,
            endFields: delivery.endFields,
          }
        : null,
    getValue:
      delivery.kind === 'relationValue'
        ? { relationId: delivery.relationId, parameter: delivery.parameter }
        : EMPTY_CHOICE.getValue,
    recordField: recordFieldOf(write),
    restriction: delivery.kind === 'message' && delivery.restriction ? delivery.restriction : EMPTY_CHOICE.restriction,
  }
}

function orderRead(raw: unknown): Order | null {
  if (!isUnread<Order>(raw) || typeof raw.kind !== 'string' || !isOrderKind(raw.kind)) return null
  return orderAdapter(raw.kind).read(raw)
}

function deliveryRead(raw: unknown): Delivery | null {
  if (!isUnread<Delivery>(raw) || typeof raw.kind !== 'string' || !isDeliveryKind(raw.kind)) return null
  return deliveryAdapter(raw.kind).read(raw)
}

function writeRead(raw: unknown): Write | null {
  if (!isUnread<Write>(raw) || typeof raw.kind !== 'string' || !isWriteKind(raw.kind)) return null
  return writeAdapter(raw.kind).read(raw)
}

function fieldsRead(raw: unknown): DataField[] {
  const fields: DataField[] = []
  for (const f of Array.isArray(raw) ? raw : []) {
    if (!isUnread<DataField>(f)) continue
    if (typeof f.code !== 'string' || f.code === '') continue
    if (f.code.includes(SOURCES_DIVIDER)) continue
    if (typeof f.name !== 'string' || f.name === '') continue

    const length =
      typeof f.length === 'number' && Number.isFinite(f.length) && f.length >= 1
        ? Math.min(LENGTH_MAX, Math.round(f.length))
        : undefined
    fields.push({
      code: f.code,
      name: f.name,
      ...(length === undefined ? {} : { length }),
    })
  }
  return fields
}

// setAside hears of every entry that is not taken as it stands: without
// readAs it was left out, with readAs it was taken in that guessed form.
export function checkDataSources(raw: unknown, setAside?: (raw: unknown, readAs?: DataSource) => void): DataSource[] {
  if (!Array.isArray(raw)) return []
  const acc: DataSource[] = []
  const seen = new Set<string>()
  for (const e of raw) {
    if (isUnread<DataSource>(e) && typeof e.id === 'string' && seen.has(e.id)) continue
    const source = sourceRead(e)
    if (source === null) {
      setAside?.(e)
      continue
    }
    seen.add(source.read.id)
    acc.push(source.read)
    if (source.guessed) setAside?.(e, source.read)
  }
  return acc
}

function sourceRead(e: unknown): { read: DataSource; guessed: boolean } | null {
  if (!isUnread<DataSource>(e)) return null
  if (typeof e.id !== 'string' || e.id === '') return null
  if (e.id.includes(SOURCES_DIVIDER)) return null
  if (typeof e.name !== 'string' || e.name.trim() === '') return null
  if (!isPresetId(e.preset)) return null
  const tableId = typeof e.tableId === 'string' ? e.tableId : ''

  let order = orderRead(e.order)
  let delivery = deliveryRead(e.delivery)
  let guessed = false
  if (!order || !delivery) {
    const listed = sourcePreset(e.preset).list(EMPTY_CHOICE)
    order = orderRead(listed.order)
    delivery = deliveryRead(listed.delivery)
    guessed = true
  }
  if (!order || !delivery) return null
  if ((orderAdapter(order.kind).needsTable || deliveryAdapter(delivery.kind).needsTable) && tableId.trim() === '')
    return null
  const write = writeRead(e.write)
  if (write === null && e.write !== undefined) guessed = true

  return {
    read: {
      id: e.id,
      name: e.name,
      preset: e.preset,
      tableId,
      order,
      delivery,
      write: write ?? { kind: 'none' },
      ...(typeof e.fieldPrefix === 'string' && e.fieldPrefix !== '' ? { fieldPrefix: e.fieldPrefix } : {}),
      ...(typeof e.folder === 'string' && e.folder.trim() !== '' ? { folder: e.folder.trim() } : {}),
      fields: fieldsRead(e.fields),
    },
    guessed,
  }
}
