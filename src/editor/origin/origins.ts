import { ACTION_PLACEHOLDER } from '../../core/data/actions'
import type { OriginKind, ValueOrigin } from '../../core/data/valueOrigin'
import { fieldEntries, type Reach, type ReachEntry } from './reach'

interface Origin {
  key: string
  kind: OriginKind
  name: string
  entries: readonly ReachEntry[]
}

export const KIND_NAMES = {
  fixed: 'Fest',
  event: 'Ereignis',
  row: 'Spalte dieser Zeile',
  block: 'Dieser Baustein',
  previous: 'Schritt davor',
  variable: 'VAR',
} as const

const EVENT_VALUES: Readonly<Record<string, string>> = {
  PINDEX: 'Satznummer',
  DROP_PINDEX: 'Satznummer der Löschung',
  VALUE: 'Wert',
  FROM_VALUE: 'Bisheriger Wert',
  NOW_DATE: 'Heutiges Datum',
  NOW_TIME: 'Aktuelle Uhrzeit',
}

const ORIGIN_FIELDS = ['kind', 'sourceId', 'blockId', 'prop', 'stepId', 'field', 'value']

export const encodeOrigin = (o: ValueOrigin): string => JSON.stringify(o, ORIGIN_FIELDS)

export const decodeOrigin = (raw: string): ValueOrigin => JSON.parse(raw) as ValueOrigin

export function originKey(o: ValueOrigin): string {
  switch (o.kind) {
    case 'helper':
      return `helper:${o.sourceId ?? ''}`
    case 'document':
    case 'source':
      return `${o.kind}:${o.sourceId}`
    case 'formField':
      return `formField:${o.blockId}:${o.prop}`
    case 'chosenRow':
    case 'captured':
    case 'changed':
    case 'split':
    case 'sum':
      return `${o.kind}:${o.blockId}`
    case 'step':
      return `step:${o.stepId}`
    default:
      return o.kind
  }
}

function origin(name: string, entries: readonly ReachEntry[], read: (value: string) => ValueOrigin): Origin {
  const sample = read('')
  return {
    key: originKey(sample),
    kind: sample.kind,
    name,
    entries: entries.map((e) => ({ ...e, value: encodeOrigin(read(e.value)) })),
  }
}

const listed = new WeakMap<Reach, Origin[]>()

export function originsOf(reach: Reach): Origin[] {
  const known = listed.get(reach)
  if (known) return known
  const opened = reach.document
  const all: Origin[] = [
    ...(reach.events
      ? [
          origin(
            KIND_NAMES.event,
            ACTION_PLACEHOLDER.map((v) => ({ value: v, name: EVENT_VALUES[v] ?? v })),
            (value) => ({ kind: 'event', value }),
          ),
        ]
      : []),
    ...(reach.row ? [origin(KIND_NAMES.row, reach.row, (value) => ({ kind: 'row', value }))] : []),
    ...(reach.captures ?? []).map((g) =>
      origin(`Erfasste Zeile: ${g.name}`, g.entries, (value) => ({ kind: 'captured', blockId: g.id, value })),
    ),
    ...(reach.changes ?? []).map((g) =>
      origin(`Geänderte Zeile: ${g.name}`, g.entries, (value) => ({ kind: 'changed', blockId: g.id, value })),
    ),
    ...(reach.splits ?? []).map((g) =>
      origin(`Verteilt: ${g.name}`, g.entries, (value) => ({ kind: 'split', blockId: g.id, value })),
    ),
    ...(reach.givers ?? []).map((g) =>
      origin(`Gewählte Zeile: ${g.name}`, g.entries, (value) => ({ kind: 'chosenRow', blockId: g.id, value })),
    ),
    ...(reach.sums ?? []).map((g) =>
      origin(`Summe: ${g.name}`, g.entries, (value) => ({ kind: 'sum', blockId: g.id, value })),
    ),
    ...(reach.steps ?? []).map((s) =>
      origin(`Schritt ${s.nr}: ${s.name}`, [{ value: '', name: 'Antwort' }], () => ({ kind: 'step', stepId: s.id })),
    ),
    ...(reach.helpers ?? []).map((g) =>
      origin(g.name, g.entries, (value) => ({ kind: 'helper', sourceId: g.id, value })),
    ),
    ...(opened
      ? [origin(opened.name, opened.entries, (value) => ({ kind: 'document', sourceId: opened.id, value }))]
      : []),
    ...(reach.formFields ?? []).map((f) =>
      origin(f.name, [{ value: '', name: 'Inhalt' }], () => ({ kind: 'formField', blockId: f.blockId, prop: f.prop })),
    ),
    ...(reach.sources ?? []).map((s) =>
      origin(s.name, fieldEntries(s), (value) => ({ kind: 'source', sourceId: s.id, value })),
    ),
  ]
  listed.set(reach, all)
  return all
}

export const originOf = (key: string, reach: Reach): Origin | undefined => originsOf(reach).find((o) => o.key === key)

export function originName(key: string, reach: Reach): string {
  switch (key) {
    case 'fixed':
      return KIND_NAMES.fixed
    case 'previous':
      return KIND_NAMES.previous
    case 'variable':
      return KIND_NAMES.variable
    default:
      return originOf(key, reach)?.name ?? ''
  }
}

export function valueName(o: ValueOrigin, reach: Reach): string {
  switch (o.kind) {
    case 'fixed':
    case 'variable':
      return o.value
    case 'event':
      return EVENT_VALUES[o.value] ?? o.value
    case 'formField':
      return originName(originKey(o), reach) || o.prop
    case 'step':
      return o.field ? `Feld ${o.field}` : 'Antwort'
    case 'previous':
      return 'Antwort'
    default: {
      const value = encodeOrigin(o)
      return originOf(originKey(o), reach)?.entries.find((e) => e.value === value)?.name ?? o.value
    }
  }
}
