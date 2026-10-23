import { bindingWithSource } from '../block/binding'
import { listProperty, type Property } from '../block/property'
import { isUnread } from '../unread'
import { asNumber, numberText, roundTo } from './number'
import type { ValueOrigin } from './valueOrigin'

interface UnitPair {
  first: string
  second: string
  factor: number
}

export type TermOrigin = Extract<ValueOrigin, { kind: 'row' | 'helper' | 'fixed' | 'chosenRow' | 'sum' }>

export type Term = (TermOrigin & { divides: boolean }) | UnitsTerm

export interface UnitsTerm {
  kind: 'units'
  first?: TermOrigin
  second?: TermOrigin
  table: UnitPair[]
  divides: boolean
}

export interface Calculation {
  key: string

  lead: string

  terms: Term[]

  decimals: number

  adds?: true
}

export const CALCULATIONS_PROP = 'calculations'

export const DECIMALS_MAX = 6

const DECIMALS_DEFAULT = 2

type Read = (origin: TermOrigin) => string

interface Member {
  left: boolean
  value: number
}

const product = (members: readonly Member[]): number => members.reduce((a, m) => a * m.value, 1)

function unitFactor(term: UnitsTerm, read: Read): number {
  const first = term.first === undefined ? '' : read(term.first).trim()
  const second = term.second === undefined ? '' : read(term.second).trim()
  return term.table.find((p) => p.first === first && p.second === second)?.factor ?? 1
}

interface Solved {
  slot: number
  text: string
}

const sum = (members: readonly Member[]): number => members.reduce((a, m) => a + m.value, 0)

function solved(b: Calculation, members: readonly Member[], left: boolean): number {
  const own = members.filter((m) => m.left === left)
  const other = members.filter((m) => m.left !== left)
  return b.adds ? sum(other) - sum(own) : product(other) / product(own)
}

export function calculated(b: Calculation, read: Read): string {
  const members: Member[] = []
  for (const term of b.terms) {
    if (term.kind === 'units') {
      members.push({ left: term.divides, value: unitFactor(term, read) })
      continue
    }
    const number = asNumber(read(term).trim())
    if (number === null) return ''
    members.push({ left: term.divides, value: number })
  }
  if (members.length === 0) return ''
  const value = roundTo(solved(b, members, true), b.decimals)
  return Number.isFinite(value) ? numberText(value, b.decimals) : ''
}

function solve(b: Calculation, slotOf: (column: string) => number, read: Read): Solved | null {
  const members: Member[] = []
  const places: { origin: TermOrigin; left: boolean }[] = [{ origin: { kind: 'row', value: b.lead }, left: true }]
  for (const term of b.terms) {
    if (term.kind === 'units') members.push({ left: term.divides, value: unitFactor(term, read) })
    else places.push({ origin: term, left: term.divides })
  }
  let gap: { slot: number; left: boolean } | null = null
  for (const { origin, left } of places) {
    const text = read(origin).trim()
    if (text !== '') {
      const number = asNumber(text)
      if (number === null) return null
      members.push({ left, value: number })
      continue
    }
    const slot = origin.kind === 'row' ? slotOf(origin.value) : -1
    if (slot === -1 || gap !== null) return null
    gap = { slot, left }
  }
  if (gap === null) return null
  const { slot, left } = gap
  const value = roundTo(solved(b, members, left), b.decimals)
  if (!Number.isFinite(value)) return null
  return { slot, text: numberText(value, b.decimals) }
}

export function rowValues(
  calculations: readonly Calculation[],
  slotOf: (column: string) => number,
  cell: (slot: number) => string,
  helper: (sourceId: string | undefined, field: string) => string = () => '',
): Map<number, string> {
  const values = new Map<number, string>()
  const read: Read = (origin) => {
    switch (origin.kind) {
      case 'row': {
        const slot = slotOf(origin.value)
        return slot === -1 ? '' : (values.get(slot) ?? cell(slot))
      }
      case 'helper':
        return helper(origin.sourceId, origin.value)
      case 'fixed':
        return origin.value
      default:
        return ''
    }
  }
  for (let round = 0; round < calculations.length; round++) {
    let filled = false
    for (const b of calculations) {
      const solved = solve(b, slotOf, read)
      if (solved === null) continue
      values.set(solved.slot, solved.text)
      filled = true
    }
    if (!filled) break
  }
  return values
}

function columnsOf(b: Calculation): string[] {
  return [b.lead, ...b.terms.flatMap((t) => (t.kind === 'row' ? [t.value] : []))]
}

export function namesColumn(calculations: readonly Calculation[], column: string): boolean {
  return column !== '' && calculations.some((b) => columnsOf(b).includes(column))
}

export function leadDecimals(calculations: readonly Calculation[], column: string): number | undefined {
  return column === '' ? undefined : calculations.find((b) => b.lead === column)?.decimals
}

export function columnSlots(calculations: readonly Calculation[], slotOf: (column: string) => number): Set<number> {
  const out = new Set<number>()
  for (const b of calculations) {
    for (const column of columnsOf(b)) {
      const slot = slotOf(column)
      if (slot !== -1) out.add(slot)
    }
  }
  return out
}

function originsOf(b: Calculation): TermOrigin[] {
  return b.terms.flatMap((t) =>
    t.kind === 'units' ? [t.first, t.second].filter((o): o is TermOrigin => o !== undefined) : [t],
  )
}

export function fieldBindingsOf(calculations: readonly Calculation[]): string[] {
  const out: string[] = []
  for (const b of calculations) {
    for (const o of originsOf(b)) {
      if (o.kind !== 'helper') continue
      const binding = bindingWithSource(o.sourceId ?? '', o.value)
      if (!out.includes(binding)) out.push(binding)
    }
  }
  return out
}

export function toldFrom(b: Calculation, column: string): Calculation | null {
  if (b.lead === column) return b
  const at = b.terms.findIndex((t) => t.kind === 'row' && t.value === column)
  if (at === -1) return null
  const own = b.terms[at]
  const rest = b.terms.filter((_, i) => i !== at).map((t) => (own.divides ? t : { ...t, divides: !t.divides }))
  const terms: Term[] = [{ kind: 'row', value: b.lead, divides: own.divides }, ...rest]
  return { ...b, lead: column, terms: [...terms.filter((t) => !t.divides), ...terms.filter((t) => t.divides)] }
}

export function newCalculation(present: readonly Calculation[], lead: string): Calculation {
  const taken = new Set(present.map((b) => b.key))
  let n = present.length + 1
  while (taken.has(`c${n}`)) n++
  return { key: `c${n}`, lead, terms: [], decimals: DECIMALS_DEFAULT }
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

const TERM_KINDS = ['row', 'helper', 'fixed'] as const

const BLOCK_TERM_KINDS = ['chosenRow', 'sum'] as const

function originFrom(raw: unknown): TermOrigin | undefined {
  if (!isUnread<TermOrigin>(raw)) return undefined
  const value = text(raw.value)
  const onBlock = BLOCK_TERM_KINDS.find((k) => k === raw.kind)
  if (onBlock !== undefined) {
    const blockId = text(raw.blockId)
    return blockId === '' || value === '' ? undefined : { kind: onBlock, blockId, value }
  }
  const kind = TERM_KINDS.find((k) => k === raw.kind)
  if (kind === undefined || value === '') return undefined
  const sourceId = text(raw.sourceId)
  return sourceId === '' ? { kind, value } : { kind, sourceId, value }
}

function unitPairsFrom(raw: unknown): UnitPair[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry): UnitPair[] => {
    if (!isUnread<UnitPair>(entry)) return []
    const factor = typeof entry.factor === 'number' && Number.isFinite(entry.factor) ? entry.factor : 1
    return [{ first: text(entry.first), second: text(entry.second), factor }]
  })
}

function termFrom(raw: unknown): Term | undefined {
  if (!isUnread<Term>(raw)) return undefined
  const divides = raw.divides === true
  if (raw.kind === 'units') {
    const first = originFrom(raw.first)
    const second = originFrom(raw.second)
    return {
      kind: 'units',
      ...(first === undefined ? {} : { first }),
      ...(second === undefined ? {} : { second }),
      table: unitPairsFrom(raw.table),
      divides,
    }
  }
  const origin = originFrom(raw)
  return origin === undefined ? undefined : { ...origin, divides }
}

function decimalsFrom(raw: unknown): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= DECIMALS_MAX ? raw : DECIMALS_DEFAULT
}

function calculationsFrom(raw: unknown): Calculation[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry, i): Calculation[] => {
    if (!isUnread<Calculation>(entry)) return []
    const terms = Array.isArray(entry.terms)
      ? entry.terms.flatMap((t): Term[] => {
          const term = termFrom(t)
          return term === undefined ? [] : [term]
        })
      : []
    const key = text(entry.key)
    return [
      {
        key: key === '' ? `c${i + 1}` : key,
        lead: text(entry.lead),
        terms,
        decimals: decimalsFrom(entry.decimals),
        ...(entry.adds === true ? { adds: true } : {}),
      },
    ]
  })
}

function calculationsForExport(calculations: readonly Calculation[]): unknown[] {
  return calculations
    .filter((b) => b.terms.length > 0)
    .map((b) => ({
      ...b,
      terms: b.terms.map(({ divides, ...term }) => (divides ? { ...term, divides } : term)),
    }))
}

export const calculationsProperty: Property<Calculation[]> = listProperty<Calculation[]>(
  calculationsFrom,
  {
    default: [],
    label: 'Berechnungen',
    place: 'none',
    attribute: 'calculations',
  },
  calculationsForExport,
)
