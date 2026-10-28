import { isUnread, type Unread } from '../unread'

export type RelationVerb = 'GET_RELATION' | 'PUT_RELATION' | 'PUTADD_RELATION'

export const RELATION_VERBS: readonly RelationVerb[] = ['GET_RELATION', 'PUT_RELATION', 'PUTADD_RELATION']

export type PlaceholderValues = Readonly<Record<string, string | undefined>>

type SlotRole =
  | 'documentKind'
  | 'position'
  | 'length'
  | 'documentNumber'
  | 'year'
  | 'archive'
  | 'positionNumber'
  | 'empty'
  | `fixed:${string}`

const NAMED_SLOT_ROLES = [
  'documentKind',
  'position',
  'length',
  'documentNumber',
  'year',
  'archive',
  'positionNumber',
  'empty',
] as const

type NamedSlotRole = (typeof NAMED_SLOT_ROLES)[number]

function isNamedSlotRole(value: string): value is NamedSlotRole {
  return (NAMED_SLOT_ROLES as readonly string[]).includes(value)
}

function isSlotRole(value: unknown): value is SlotRole {
  return typeof value === 'string' && (isNamedSlotRole(value) || value.startsWith('fixed:'))
}

export interface PositionFetch {
  slots: readonly SlotRole[]
  answerLength: number
}

export interface RelationTemplate {
  id: string

  name: string
  verb: RelationVerb

  nr: string

  parameter: readonly string[]

  extraParameterAllowed?: boolean

  positions?: PositionFetch
}

export const POSITIONS_RELATION: Omit<RelationTemplate, 'id'> = {
  name: 'Positionen holen (Relation 69)',
  verb: 'GET_RELATION',
  nr: '69',
  parameter: ['BELART', 'POS', 'LEN', 'NR', 'JAHR', 'ARCHIV', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6'],
  positions: {
    slots: [
      'documentKind',
      'position',
      'length',
      'documentNumber',
      'year',
      'archive',
      'empty',
      'empty',
      'positionNumber',
      'empty',
      'empty',
      'empty',
    ],
    answerLength: 255,
  },
}

export const OLD_POSITIONS_PARAMETER = ['BELART', 'POS', 'LEN', 'BELNR', 'JAHR', 'ARCHIV', '', 'POSNR', '', '', '', '']
export const OLD_POSITIONS_SLOTS: readonly SlotRole[] = [
  'documentKind',
  'position',
  'length',
  'documentNumber',
  'year',
  'archive',
  'empty',
  'positionNumber',
  'empty',
  'empty',
  'empty',
  'empty',
]

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])

function documentedPositions(
  nr: string,
  parameter: string[],
  positions: PositionFetch | null,
): { parameter: string[]; positions: PositionFetch | null } {
  const documented = POSITIONS_RELATION.positions
  if (nr.trim() !== POSITIONS_RELATION.nr || !positions || !documented) return { parameter, positions }
  if (!sameList(positions.slots, OLD_POSITIONS_SLOTS)) return { parameter, positions }
  return {
    parameter: sameList(parameter, OLD_POSITIONS_PARAMETER) ? [...POSITIONS_RELATION.parameter] : parameter,
    positions: { ...positions, slots: [...documented.slots] },
  }
}

export type RuntimeRelation = Pick<RelationTemplate, 'id' | 'verb' | 'nr' | 'parameter' | 'positions'>

interface PositionAsk {
  documentKind: string
  documentNumber: string
  year: string
  archive: string
  positionNumber: number
  pos: string
  len: string
}

const SLOT_VALUES: Record<NamedSlotRole, (ask: PositionAsk) => string> = {
  documentKind: (ask) => ask.documentKind,
  position: (ask) => ask.pos,
  length: (ask) => ask.len,
  documentNumber: (ask) => ask.documentNumber,
  year: (ask) => ask.year,
  archive: (ask) => ask.archive,
  positionNumber: (ask) => String(ask.positionNumber),
  empty: () => '',
}

export function positionParams(slots: readonly SlotRole[], ask: PositionAsk): string[] {
  return slots.map((role) => (isNamedSlotRole(role) ? SLOT_VALUES[role](ask) : role.slice('fixed:'.length)))
}

export function checkPositionFetch(raw: unknown, parameterCount: number): PositionFetch | null {
  if (!isUnread<PositionFetch>(raw)) return null
  if (!Array.isArray(raw.slots) || raw.slots.length !== parameterCount) return null
  const slots = raw.slots.filter(isSlotRole)
  if (slots.length !== raw.slots.length) return null
  const answerLength = raw.answerLength
  if (typeof answerLength !== 'number' || !Number.isInteger(answerLength) || answerLength < 1) return null
  return { slots, answerLength }
}

export interface RelationAnswer {
  value: string

  raw: unknown

  failed?: boolean
}

type RelationSyntax = Pick<RelationTemplate, 'verb' | 'nr' | 'parameter' | 'extraParameterAllowed'>

export function relIdFromIdbId(idbId: string): string {
  return idbId.replace(/^IDB/, '')
}

export function todayAsText(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

export function nowTimeAsText(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}

export function fieldCodeSplit(code: string): { pos: string; len: string } | null {
  const m = /^(\d+)_(\d+)$/.exec(code)
  return m ? { pos: m[1], len: m[2] } : null
}

type ParameterRole = 'pos' | 'len' | 'relid'

export function parameterRole(raw: string): ParameterRole | null {
  const match = /^(?:([A-Za-z_]+)|\{([A-Za-z_]+)\})$/.exec(raw)
  const name = (match?.[1] ?? match?.[2])?.toUpperCase()
  if (name === 'POS' || name === 'FELD_POS') return 'pos'
  if (name === 'LEN' || name === 'FELD_LEN') return 'len'
  if (name === 'IDBID' || name === 'RELID') return 'relid'
  return null
}

export function relationSyntaxRead(input: string): RelationSyntax | null {
  const raw = input.trim()
  const head = /^(GET_RELATION|PUTADD_RELATION|PUT_RELATION)\[/i.exec(raw)
  if (!head || !raw.endsWith(']') || /[\r\n]/.test(raw)) return null

  const body = raw.slice(head[0].length, -1)
  const parts = body.split('!')
  const nr = parts.shift() ?? ''
  if (!/^\d+$/.test(nr)) return null

  let allowExtraParams = false
  if (parts.at(-1) === '...') {
    allowExtraParams = true
    parts.pop()
  }

  const params = parts.map((param) => {
    const doubled = /^\{\{([A-Za-z0-9_]+)\}\}$/.exec(param)
    return doubled ? `{${doubled[1]}}` : param
  })

  return {
    verb: head[1].toUpperCase() as RelationVerb,
    nr,
    parameter: params,
    extraParameterAllowed: allowExtraParams,
  }
}

export function relationSyntaxAsText(
  relation: Pick<RelationTemplate, 'verb' | 'nr' | 'parameter' | 'extraParameterAllowed'>,
): string {
  const parts = [relation.nr, ...relation.parameter]
  if (relation.extraParameterAllowed) parts.push('...')
  return `${relation.verb}[${parts.join('!')}]`
}

export function relationFitsToSearch(
  relation: Pick<RelationTemplate, 'name' | 'verb' | 'nr' | 'parameter' | 'extraParameterAllowed'>,
  query: string,
): boolean {
  const needle = query.trim().toLocaleLowerCase('de')
  if (needle === '') return true
  return [relation.name, relation.nr, relationSyntaxAsText(relation)].some((value) =>
    value.toLocaleLowerCase('de').includes(needle),
  )
}

export function checkRelationTemplates(raw: unknown): RelationTemplate[] {
  if (!Array.isArray(raw)) return []
  const acc: RelationTemplate[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e: Unread<RelationTemplate> = entry
    if (typeof e.id !== 'string' || e.id === '') continue
    if (seen.has(e.id)) continue
    if (typeof e.name !== 'string' || e.name.trim() === '') continue
    if (typeof e.verb !== 'string' || !RELATION_VERBS.includes(e.verb as RelationVerb)) continue
    if (typeof e.nr !== 'string' || e.nr.trim() === '') continue
    if (!Array.isArray(e.parameter) || e.parameter.some((p) => typeof p !== 'string')) continue
    const { parameter, positions } = documentedPositions(
      e.nr,
      [...(e.parameter as string[])],
      e.verb === 'GET_RELATION' ? checkPositionFetch(e.positions, e.parameter.length) : null,
    )
    seen.add(e.id)
    acc.push({
      id: e.id,
      name: e.name,
      verb: e.verb as RelationVerb,
      nr: e.nr,
      parameter,
      extraParameterAllowed: e.extraParameterAllowed === true,
      ...(positions ? { positions } : {}),
    })
  }
  return acc
}
