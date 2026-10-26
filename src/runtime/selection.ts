import { BLOCK_ID_ATTR } from '../core/data/actions'
import { completePairs } from '../core/data/extraSources'
import { followsSelectionProperty, followUsable, type SelectionFollow } from '../core/data/selectionFollow'
import { outsideValue } from './foreignSources'
import { maskHost } from './host'

interface Chosen {
  row: unknown
  trait: string
  number: number
  made?: true
}

// One chosen row per giver, and the guard that keeps a report from starting
// while listeners still hear the last one.
const state = {
  chosen: new Map<string, Chosen>(),
  listeners: new Set<(byControls: boolean) => void>(),
  counter: 0,
  messageRuns: false,
  lateReport: false,
  toControls: false,
}

export function traitOf(row: unknown): string {
  if (row == null) return ''
  try {
    return (
      JSON.stringify(row, (_key, value: unknown) => {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return value
        return Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)))
      }) ?? ''
    )
  } catch {
    return ''
  }
}

function report(byControls: boolean): void {
  const selection = state
  if (selection.messageRuns) {
    selection.lateReport = true
    selection.toControls ||= byControls
    return
  }
  selection.messageRuns = true
  let origin = byControls
  try {
    do {
      selection.lateReport = false
      selection.toControls = false
      selection.listeners.forEach((cb) => cb(origin))
      origin = selection.toControls
    } while (selection.lateReport)
  } finally {
    selection.messageRuns = false
  }
}

export function onSelectionList(cb: (byControls: boolean) => void): void {
  state.listeners.add(cb)
}

export function selectionFor(giverId: string): unknown | undefined {
  return state.chosen.get(giverId)?.row
}

function selectionTrait(giverId: string): string {
  return state.chosen.get(giverId)?.trait ?? ''
}

export function selectionNumber(giverId: string): number {
  return state.chosen.get(giverId)?.number ?? 0
}

export function giverIdOf(el: Element): string {
  return el.getAttribute(BLOCK_ID_ATTR) ?? ''
}

export function relocateSelection<T>(
  giverId: string,
  candidates: readonly T[],
  rowOf: (candidate: T) => unknown,
  keyFor?: (candidate: T) => string,
): number[] {
  if (giverId === '') return []
  if (state.chosen.get(giverId)?.made) return []
  const trait = selectionTrait(giverId)
  if (trait === '') return []
  const hit: number[] = []
  candidates.forEach((candidate, i) => {
    if ((keyFor?.(candidate) || traitOf(rowOf(candidate))) === trait) hit.push(i)
  })
  if (hit.length === 0) clearSelection(giverId)
  else {
    const chosen = state.chosen
    const old = chosen.get(giverId)
    const row = rowOf(candidates[hit[0]])
    if (old && traitOf(old.row) !== traitOf(row)) {
      chosen.set(giverId, { ...old, row })
      report(false)
    }
  }
  return hit
}

export function chooseSelection(giverId: string, row: unknown, key = ''): void {
  if (giverId === '') return
  const trait = key || traitOf(row)
  if (trait === '') return
  const selection = state
  const old = selection.chosen.get(giverId)
  if (old && old.trait === trait) selection.chosen.delete(giverId)
  else selection.chosen.set(giverId, { row, trait, number: ++selection.counter })
  report(true)
}

export function setSelection(giverId: string, row: unknown, byControls = false, key = ''): void {
  if (giverId === '') return
  const trait = key || traitOf(row)
  if (trait === '') return
  const selection = state
  if (selection.chosen.get(giverId)?.trait === trait) return
  selection.chosen.set(giverId, { row, trait, number: ++selection.counter })
  report(byControls)
}

export function setMadeSelection(giverId: string, row: unknown, key: string): void {
  if (giverId === '' || key === '') return
  const selection = state
  if (selection.chosen.get(giverId)?.trait === key) return
  selection.chosen.set(giverId, { row, trait: key, number: ++selection.counter, made: true })
  report(true)
}

export function clearSelection(giverId: string): void {
  const chosen = state.chosen
  if (!chosen.has(giverId)) return
  chosen.delete(giverId)
  report(false)
}

function followsFromAttribute(el: HTMLElement): SelectionFollow[] {
  const { type, attribute } = followsSelectionProperty
  return type
    .fromAttribute(el.getAttribute(attribute), [])
    .filter((f) => f.giverId !== '' || followUsable(f))
    .map((f) => ({ giverId: f.giverId, pairs: completePairs(f) }))
}

export function selectionGiverOf(el: HTMLElement): string[] {
  return followsFromAttribute(el)
    .map((f) => f.giverId)
    .filter((id) => id !== '')
}

export function followsFormField(el: HTMLElement, blockId: string): boolean {
  return followsFromAttribute(el).some((f) => f.pairs.some((p) => p.from === 'formField' && p.fromField === blockId))
}

export function rowsToSelection(el: HTMLElement, rows: unknown[]): unknown[] {
  const host = maskHost()
  let out = rows
  for (const follow of followsFromAttribute(el)) {
    const needsRow =
      follow.giverId !== '' && (follow.pairs.length === 0 || follow.pairs.some((p) => p.from === undefined))
    const selection = needsRow ? selectionFor(follow.giverId) : undefined
    if (needsRow && selection === undefined) return []

    const expected = follow.pairs.map((p) => outsideValue(p, el) ?? host.readField(selection, p.fromField))
    if (follow.pairs.some((p, i) => !p.unequal && expected[i].trim() === '')) return []

    out = out.filter((row) =>
      follow.pairs.every((p, i) => {
        if (p.unequal) return expected[i].trim() === '' || expected[i] !== host.readField(row, p.toField)
        return expected[i] === host.readField(row, p.toField)
      }),
    )
  }
  return out
}

export function firstRowToSelection(el: HTMLElement, rows: unknown[]): unknown {
  return rowsToSelection(el, rows)[0]
}
