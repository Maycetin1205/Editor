import { orderedFields, type DataSource } from '../core/data/dataSources'
import { ORDER_KINDS, orderAdapter } from '../core/data/orders'
import { sheetFrom } from '../core/data/sheet'
import { escapeNonAsciiJs } from './serializer'
import type { GetRelationEntry } from './pictureRelations'

export function buildSevariablen(
  used: readonly DataSource[],

  usedFields: ReadonlyMap<string, ReadonlySet<string>>,

  getKey: ReadonlyMap<string, string[]>,

  getRelation: readonly GetRelationEntry[] = [],
): string {
  const byId = new Map(used.map((s) => [s.id, s]))
  const fields = (facts: { id: string }, wildcard: boolean): string => {
    const s = byId.get(facts.id)
    return s === undefined ? '' : orderedFields(s, usedFields.get(s.id), getKey.get(s.id) ?? [], wildcard)
  }
  const parts = ORDER_KINDS.map((kind) =>
    orderAdapter(kind).sheet(
      used.filter((s) => s.order.kind === kind),
      fields,
    ),
  )
  const sheet = {
    ...sheetFrom(parts),
    ...(getRelation.length > 0 ? { GET_RELATION: getRelation } : {}),
  }
  return escapeNonAsciiJs(JSON.stringify(sheet, null, 2)) + '\n'
}
