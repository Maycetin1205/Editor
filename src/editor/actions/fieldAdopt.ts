import { relationParameterDefault, type Parameter } from '../../core/data/actions'
import type { DataSource } from '../../core/data/dataSources'
import {
  fieldCodeSplit,
  parameterRole,
  relIdFromIdbId,
  type RelationTemplate,
} from '../../core/data/relations'

interface AdoptField {
  sourceId: string
  code: string
  label: string
  posLen: string
}

function fieldPosLen(source: DataSource, code: string): { pos: string; len: string } | null {
  const prefix = source.fieldPrefix ?? ''
  const without = prefix !== '' && code.startsWith(prefix) ? code.slice(prefix.length) : code
  return fieldCodeSplit(without)
}

export function adoptFields(sources: readonly DataSource[]): AdoptField[] {
  return sources.flatMap((source) => source.fields.flatMap((field) => {
    const pl = fieldPosLen(source, field.code)
    return pl ? [{ sourceId: source.id, code: field.code, label: field.name, posLen: `${pl.pos}_${pl.len}` }] : []
  }))
}

export function fieldAdopt(
  params: readonly Parameter[],
  relation: RelationTemplate,
  source: DataSource,
  code: string,
): Parameter[] {
  const defaults = relationParameterDefault(relation)
  const posLen = fieldPosLen(source, code)
  return relation.parameter.map((raw, i) => {
    const role = parameterRole(raw)
    if (role === 'relid') return { source: 'fixed', value: relIdFromIdbId(source.tableId) }
    if (role === 'pos' && posLen) return { source: 'fixed', value: posLen.pos }
    if (role === 'len' && posLen) return { source: 'fixed', value: posLen.len }
    return { ...(params[i] ?? defaults[i]) }
  })
}

export function adoptedField(
  relation: RelationTemplate,
  params: readonly Parameter[],
  sources: readonly DataSource[],
): AdoptField | undefined {
  const fixed = (role: string): string => {
    const at = relation.parameter.findIndex((p) => parameterRole(p) === role)
    const b = at < 0 ? undefined : params[at]
    return b?.source === 'fixed' ? b.value.trim() : ''
  }
  const hasTable = relation.parameter.some((p) => parameterRole(p) === 'relid')
  return adoptFields(sources).find((f) => {
    const split = fieldCodeSplit(f.posLen)
    const source = sources.find((s) => s.id === f.sourceId)
    return split !== null && split.pos === fixed('pos') && split.len === fixed('len')
      && (!hasTable || relIdFromIdbId(source?.tableId ?? '') === fixed('relid'))
  })
}
