// A relation of SoftEngine as the library holds it: the verb, the number and
// the names of its parameters. A step of an action fills the parameters.

export type RelationVerb = 'GET_RELATION' | 'PUT_RELATION' | 'PUTADD_RELATION'

export const RELATION_VERBS: readonly { value: RelationVerb; label: string; hint: string }[] = [
  { value: 'GET_RELATION', label: 'GET', hint: 'holt einen Wert oder eine Liste' },
  { value: 'PUT_RELATION', label: 'PUT', hint: 'schreibt oder löst etwas aus' },
  { value: 'PUTADD_RELATION', label: 'PUTADD', hint: 'fügt etwas hinzu' },
]

export interface RelationData {
  id: string
  name: string
  verb: RelationVerb
  nr: string
  // One name per parameter, in the order SoftEngine expects them.
  params: string[]
  // Further parameters may follow the named ones.
  extra: boolean
}

export function isRelationVerb(value: unknown): value is RelationVerb {
  return RELATION_VERBS.some((verb) => verb.value === value)
}

// Relations this editor uses by itself. The numbers are the ones the hand-made
// reception mask proved against a SoftEngine installation.
export const IDB_WRITE = {
  verb: 'PUT_RELATION' as const,
  nr: '174',
  // [position, length, field kind, record number, IDB, value]
  fieldKind: { text: 'L', number: 'R', money: 'R', date: 'D', time: 'Z', bool: 'L' } as const,
}

export const IDB_CREATE = { verb: 'GET_RELATION' as const, nr: '640' }

// "GET_RELATION[640!IDB]" as text, the way SoftEngine documents relations.
export function relationText(relation: Pick<RelationData, 'verb' | 'nr' | 'params' | 'extra'>): string {
  const parts = [relation.nr, ...relation.params]
  if (relation.extra) parts.push('...')
  return `${relation.verb}[${parts.join('!')}]`
}

// Reads "PUT_RELATION[174!POS!LEN!...]"; null when the text is no relation.
export function parseRelationText(input: string): Omit<RelationData, 'id' | 'name'> | null {
  const raw = input.trim()
  const head = /^(GET_RELATION|PUTADD_RELATION|PUT_RELATION)\[/i.exec(raw)
  if (!head || !raw.endsWith(']') || /[\r\n]/.test(raw)) return null
  const parts = raw.slice(head[0].length, -1).split('!')
  const nr = parts.shift() ?? ''
  if (!/^\d+$/.test(nr)) return null
  let extra = false
  if (parts.at(-1) === '...') {
    extra = true
    parts.pop()
  }
  const params = parts.map((param) => {
    const braced = /^\{+([A-Za-z0-9_]+)\}+$/.exec(param)
    return braced ? braced[1] : param
  })
  return { verb: head[1].toUpperCase() as RelationVerb, nr, params, extra }
}

export function relationMatches(relation: RelationData, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('de')
  if (needle === '') return true
  return [relation.name, relation.nr, relationText(relation)].some((text) =>
    text.toLocaleLowerCase('de').includes(needle),
  )
}

export function readRelations(raw: unknown): RelationData[] {
  if (!Array.isArray(raw)) return []
  const out: RelationData[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (typeof e.id !== 'string' || e.id === '' || seen.has(e.id)) continue
    if (typeof e.name !== 'string' || !isRelationVerb(e.verb)) continue
    if (typeof e.nr !== 'string' || e.nr.trim() === '') continue
    const params = Array.isArray(e.params) ? e.params.filter((p): p is string => typeof p === 'string') : []
    seen.add(e.id)
    out.push({ id: e.id, name: e.name, verb: e.verb, nr: e.nr.trim(), params, extra: e.extra === true })
  }
  return out
}
