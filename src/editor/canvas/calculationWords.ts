import type { ListGroup } from '@/editor/widgets/List'
import { DECIMALS_MAX, type Calculation, type Term, type TermOrigin, type UnitsTerm } from '../../core/data/calculation'
import { numberText } from '../../core/data/number'
import { decodeOrigin, encodeOrigin, originKey, originName, originOf, originsOf, valueName } from '../origin/origins'
import type { Reach } from '../origin/reach'

export interface Names {
  lead: string
  reach: Reach

  leadName?: string
}

const FIXED = 'Feste Zahl'
export const UNITS = 'Faktor aus zwei Einheiten'

export const columnTitle = (names: Names, key: string): string =>
  names.leadName !== undefined && key === '' ? names.leadName : valueName({ kind: 'row', value: key }, names.reach)

export const termsText = (count: number): string =>
  count === 0 ? 'Keine' : count === 1 ? '1 Größe' : `${count} Größen`

export function pairsText(term: UnitsTerm): string {
  return term.table.map((p) => `${p.first}/${p.second} ${numberText(p.factor, DECIMALS_MAX)}`).join(', ')
}

export function termName(term: Term, names: Names): string {
  if (term.kind === 'sum') return `Summe ${valueName(term, names.reach)}`
  if (term.kind !== 'units') return valueName(term, names.reach)
  const first = term.first === undefined ? '' : valueName(term.first, names.reach)
  const second = term.second === undefined ? '' : valueName(term.second, names.reach)
  return first !== '' && second !== '' ? `Faktor(${first}/${second})` : 'Faktor'
}

export function signOf(b: Pick<Calculation, 'adds'>, divides: boolean): string {
  if (b.adds) return divides ? '−' : '+'
  return divides ? '÷' : '×'
}

export function sentenceText(b: Calculation, names: Names): string {
  const words = b.terms.map((t, i) => {
    const sign = signOf(b, t.divides)
    const name = termName(t, names)
    return i === 0 && !t.divides ? name : `${sign} ${name}`
  })
  const lead = columnTitle(names, b.lead)
  if (words.length === 0) return `${lead} =`
  return `${lead} = ${words.join(' ')}, gerundet auf ${b.decimals} Stellen`
}

export function termOrigin(value: string): TermOrigin | undefined {
  const o = decodeOrigin(value)
  return o.kind === 'row' || o.kind === 'helper' || o.kind === 'fixed' || o.kind === 'chosenRow' || o.kind === 'sum'
    ? o
    : undefined
}

export const termOriginKey = (term: Term): string => (term.kind === 'units' ? 'units' : originKey(term))

export function originGroups(names: Names): ListGroup[] {
  return [
    { key: 'mask', entries: originsOf(names.reach).map((o) => ({ value: o.key, name: o.name })) },
    {
      key: 'more',
      entries: [
        { value: 'fixed', name: FIXED },
        { value: 'units', name: UNITS },
      ],
    },
  ]
}

export function originText(key: string, names: Names): string {
  if (key === 'fixed') return FIXED
  if (key === 'units') return UNITS
  return originName(key, names.reach)
}

export function entryGroups(key: string, names: Names): ListGroup[] {
  const lead = encodeOrigin({ kind: 'row', value: names.lead })
  const entries = (originOf(key, names.reach)?.entries ?? []).filter((e) => e.value !== lead)
  return entries.length > 0 ? [{ key, entries }] : []
}

export const unitGroups = (names: Names): ListGroup[] =>
  originsOf(names.reach).map((o) => ({ key: o.key, name: o.name, entries: o.entries }))
