import type { ValueBinding } from './actions'
import { formatValue } from './format'

// A data source: where rows come from and which fields a row has.

export type FieldType = 'text' | 'number' | 'money' | 'date' | 'time' | 'bool'

export const FIELD_TYPES: readonly { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Zahl' },
  { value: 'money', label: 'Betrag' },
  { value: 'date', label: 'Datum' },
  { value: 'time', label: 'Uhrzeit' },
  { value: 'bool', label: 'Ja/Nein' },
]

export interface FieldData {
  // How SoftEngine names the field: "78_30" (position_length), "ADR_2_8", a column name.
  code: string
  name: string
  type: FieldType
}

// Looks a record up in another source: the value of `field` is searched in
// `targetField` of `source`. The fields of the record found are then usable
// like own fields, written "Kunde.Nachname".
export interface LinkData {
  id: string
  name: string
  field: string
  source: string
  targetField: string
}

export type SourceKindId = 'idb' | 'file' | 'record' | 'query' | 'dataset' | 'erpMask' | 'relation'

export interface SourceData {
  id: string
  // The ALIAS SoftEngine delivers the rows under.
  name: string
  kind: SourceKindId
  // IDB number, file, query, DataSet or mask number, depending on the kind.
  table: string
  // The field that identifies a record (Satznummer); '' when there is none.
  recordField: string
  fields: FieldData[]
  links: LinkData[]
  // Rows the editor shows instead of real data, one value per field code.
  sample: Record<string, string>[]

  // file: the list hangs under the open record, e.g. "BEL_0_10".
  headerKey?: string
  // erpMask: the area (BEREICH) of the SoftEngine mask.
  area?: string
  // query: narrows an ERP query.
  documentKind?: string
  addressFrom?: { source: string; field: string }
  // relation: the GET_RELATION that delivers the rows.
  relation?: string
  params?: ValueBinding[]
}

export const POS_LEN = /^\d+_\d+$/

// "78_30" -> position 78, length 30; also with a table in front ("ADR_2_8").
export function positionOf(code: string): { pos: number; len: number } | null {
  const m = /(?:^|_)(\d+)_(\d+)$/.exec(code.trim())
  return m ? { pos: Number(m[1]), len: Number(m[2]) } : null
}

export function lengthOf(code: string): number | null {
  return positionOf(code)?.len ?? null
}

// A field reference as blocks store it: "78_30" for an own field,
// "lnk_ab12cd34>3322_40" for a field reached over a link.
export const LINK_DIVIDER = '>'

export function splitRef(ref: string): { link: string; code: string } {
  const at = ref.indexOf(LINK_DIVIDER)
  return at < 0 ? { link: '', code: ref } : { link: ref.slice(0, at), code: ref.slice(at + 1) }
}

export function joinRef(link: string, code: string): string {
  return link === '' ? code : `${link}${LINK_DIVIDER}${code}`
}

export interface FieldOption {
  ref: string
  code: string
  // "Tiername" or "Kunde.Nachname": how templates and the editor name it.
  name: string
  label: string
  group: string
  type: FieldType
}

const TOKEN = /\{([^{}\n]+)\}/g
const sameName = (a: string, b: string): boolean => a.trim().toLocaleLowerCase('de') === b.trim().toLocaleLowerCase('de')

// What a source offers: its own fields and those reached over its links.
// Resolves the names used in templates ("Hallo {Vorname}") to fields.
export class SourceSchema {
  readonly source: SourceData | undefined
  private readonly all: readonly SourceData[]
  private cache: FieldOption[] | null = null

  constructor(source: SourceData | undefined, all: readonly SourceData[]) {
    this.source = source
    this.all = all
  }

  static of(sourceId: string, all: readonly SourceData[]): SourceSchema {
    return new SourceSchema(
      all.find((source) => source.id === sourceId),
      all,
    )
  }

  options(): FieldOption[] {
    if (this.cache) return this.cache
    const source = this.source
    if (!source) return (this.cache = [])
    const own: FieldOption[] = source.fields.map((field) => ({
      ref: field.code,
      code: field.code,
      name: field.name,
      label: field.name,
      group: '',
      type: field.type,
    }))
    const linked = source.links.flatMap((link) => {
      const target = this.all.find((other) => other.id === link.source)
      return (target?.fields ?? []).map((field) => ({
        ref: joinRef(link.id, field.code),
        code: field.code,
        name: `${link.name}.${field.name}`,
        label: field.name,
        group: link.name,
        type: field.type,
      }))
    })
    return (this.cache = [...own, ...linked])
  }

  option(ref: string): FieldOption | undefined {
    return ref === '' ? undefined : this.options().find((option) => option.ref === ref)
  }

  nameOf(ref: string): string {
    return this.option(ref)?.name ?? ''
  }

  typeOf(ref: string): FieldType {
    return this.option(ref)?.type ?? 'text'
  }

  refOfName(name: string): string | undefined {
    return this.options().find((option) => sameName(option.name, name))?.ref
  }

  // The field references a template reads.
  refsIn(template: string): string[] {
    const refs: string[] = []
    for (const match of template.matchAll(TOKEN)) {
      const ref = this.refOfName(match[1])
      if (ref !== undefined && !refs.includes(ref)) refs.push(ref)
    }
    return refs
  }

  // Names in a template no field answers to.
  unknownIn(template: string): string[] {
    return [...template.matchAll(TOKEN)].map((m) => m[1]).filter((name) => this.refOfName(name) === undefined)
  }

  // "Hallo {Vorname}" with the values of a row. A name no field answers to
  // stays as written, so the mistake shows.
  render(template: string, read: (ref: string) => string): string {
    return template.replace(TOKEN, (whole, name: string) => {
      const option = this.options().find((candidate) => sameName(candidate.name, name))
      return option ? formatValue(read(option.ref), option.type) : whole
    })
  }

  // The value of one field as a mask shows it.
  show(ref: string, read: (ref: string) => string): string {
    const option = this.option(ref)
    return option ? formatValue(read(ref), option.type) : ''
  }
}

export function hasTokens(template: string): boolean {
  TOKEN.lastIndex = 0
  return TOKEN.test(template)
}

// After a field or link got a new name: the templates that used the old one.
export function renameInTemplate(template: string, oldName: string, newName: string): string {
  return template.replace(TOKEN, (whole, name: string) => (sameName(name, oldName) ? `{${newName}}` : whole))
}

const TYPE_HINTS: readonly [RegExp, FieldType][] = [
  [/datum|geburt|\bam\b|termin(?!art)|date/i, 'date'],
  [/uhrzeit|zeit|\bum\b|time|ankunft/i, 'time'],
  [/betrag|preis|summe|netto|brutto|umsatz|kosten/i, 'money'],
  [/menge|anzahl|dauer|nummer|\bnr\b|index|gewicht|alter/i, 'number'],
  [/kennzeichen|aktiv|erledigt|notfall|gesperrt/i, 'bool'],
]

// A first guess at the type of a field from its name.
export function guessFieldType(name: string): FieldType {
  return TYPE_HINTS.find(([pattern]) => pattern.test(name))?.[1] ?? 'text'
}

export function readSources(raw: unknown): SourceData[] {
  if (!Array.isArray(raw)) return []
  const out: SourceData[] = []
  const seen = new Set<string>()
  const text = (v: unknown): string => (typeof v === 'string' ? v : '')
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    const id = text(e.id)
    if (id === '' || seen.has(id) || text(e.name).trim() === '') continue
    seen.add(id)
    const fields: FieldData[] = (Array.isArray(e.fields) ? e.fields : [])
      .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
      .filter((f) => text(f.code) !== '')
      .map((f) => ({
        code: text(f.code),
        name: text(f.name) || text(f.code),
        type: FIELD_TYPES.some((t) => t.value === f.type) ? (f.type as FieldType) : guessFieldType(text(f.name)),
      }))
    const links: LinkData[] = (Array.isArray(e.links) ? e.links : [])
      .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
      .filter((l) => text(l.id) !== '' && text(l.source) !== '')
      .map((l) => ({
        id: text(l.id),
        name: text(l.name) || 'Verknüpfung',
        field: text(l.field),
        source: text(l.source),
        targetField: text(l.targetField),
      }))
    const kind = text(e.kind) as SourceKindId
    out.push({
      ...(e as unknown as SourceData),
      id,
      name: text(e.name).trim(),
      kind: ['idb', 'file', 'record', 'query', 'dataset', 'erpMask', 'relation'].includes(kind) ? kind : 'idb',
      table: text(e.table),
      recordField: text(e.recordField),
      fields,
      links,
      sample: Array.isArray(e.sample) ? (e.sample as Record<string, string>[]) : [],
    })
  }
  return out
}
