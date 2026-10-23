import { listProperty, type Property } from '../block/property'
import type { Unread } from '../unread'
import { completePairs, keyPairsFrom, type KeyPair } from './extraSources'

export interface SelectionFollow {
  giverId: string

  pairs: KeyPair[]
}

export const SELECTION_FOLLOW_PROP = 'followsSelection'

export const followsSelectionProperty: Property<SelectionFollow[]> = listProperty<SelectionFollow[]>(selectionFollowsFrom, {
  default: [],
  label: 'Folgt der Auswahl',
  place: 'none',
  attribute: 'followsselection',
})

export function followUsable(f: SelectionFollow): boolean {
  const pairs = completePairs(f)
  return pairs.length > 0 && (f.giverId !== '' || pairs.every((p) => p.from !== undefined))
}

function selectionFollowsFrom(raw: unknown): SelectionFollow[] {
  if (!Array.isArray(raw)) return []
  const acc: SelectionFollow[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e: Unread<SelectionFollow> = entry
    if (typeof e.giverId !== 'string') continue
    acc.push({ giverId: e.giverId, pairs: keyPairsFrom(e.pairs) })
  }
  return acc
}
