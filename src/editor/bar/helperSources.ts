import type { DataField, DataSource } from '../../core/data/dataSources'
import type { ExtraSource, KeyPair } from '../../core/data/extraSources'
import { originPair, pairOrigin, type ValueOrigin } from '../../core/data/valueOrigin'
import { fieldEntries, sourceGroup, type Reach } from '../origin/reach'

// Sources a picker may still offer: not taken by the first source or another helper, except its own.
export function freeSources(
  library: readonly DataSource[],
  first: string,
  extra: readonly ExtraSource[],
  own: string,
): DataSource[] {
  const taken = new Set([first, ...extra.map((q) => q.sourceId)])
  taken.delete(own)
  return library.filter((s) => !taken.has(s.id))
}

export const fieldsOfSource = (library: readonly DataSource[], id: string): readonly DataField[] =>
  library.find((s) => s.id === id)?.fields ?? []

// What a helper can read from: the row of the first source and the other helpers, plus the outside.
export function reachFor(
  library: readonly DataSource[],
  first: string,
  extra: readonly ExtraSource[],
  index: number,
  outside: Pick<Reach, 'document' | 'formFields'>,
): Reach {
  const own = extra[index]
  return {
    row: fieldEntries(library.find((s) => s.id === first)),
    helpers: extra
      .filter((q, at) => at !== index && q.sourceId !== '' && q.sourceId !== own?.sourceId)
      .flatMap((q) => library.filter((s) => s.id === q.sourceId).map(sourceGroup)),
    ...outside,
  }
}

// The other helper a helper's key pairs read from, or '' for the row of the first source.
export function partnerOf(first: string, own: ExtraSource | undefined): string {
  return !own || own.partnerId === own.sourceId || own.partnerId === first ? '' : own.partnerId
}

export function originOf(partner: string, pair: KeyPair): ValueOrigin | null {
  return pairOrigin(pair, (value) =>
    partner === '' ? { kind: 'row', value } : { kind: 'helper', sourceId: partner, value },
  )
}

const fromPartner = (p: KeyPair, fromField: string): KeyPair => ({ fromField, toField: p.toField })

// The change to a helper when the origin of its key pair `at` is picked; null when nothing changes.
export function originChange(
  own: ExtraSource,
  partnerNow: string,
  at: number,
  origin: ValueOrigin,
): Partial<ExtraSource> | null {
  const pairs = [...own.pairs]
  const pair = pairs[at]
  if (!pair) return null
  const next = originPair(origin, pair.toField)
  if (!next) return null
  if (next.from !== undefined) {
    pairs[at] = next
    return { pairs }
  }
  const partner = origin.kind === 'helper' ? (origin.sourceId ?? '') : ''
  const same = partner === partnerNow
  return {
    partnerId: partner,
    pairs: pairs.map((p, x) => (x === at ? next : same || p.from !== undefined ? p : fromPartner(p, ''))),
  }
}
