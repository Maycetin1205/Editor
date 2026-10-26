import { capability } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import type { MaskTree } from '../../core/block/tree'
import type { DataSource } from '../../core/data/dataSources'
import type { NoticeLine } from './noticeText'
import { idOf, leftoverForFile, valuesKept, type Leftover } from './leftover'

// Names what of a mask this editor keeps aside as it stands now: what was
// changed here since no longer counts. It stays in the mask file, but not in
// the export.
export function leftoverLines(tree: MaskTree, sources: readonly DataSource[], left: Leftover): NoticeLine[] {
  const part = leftoverForFile(tree, sources, left)
  const lines: NoticeLine[] = []

  const types = new Map<string, number>()
  for (const raw of Object.values(part?.nodes ?? {})) {
    const type = typeOf(raw)
    types.set(type, (types.get(type) ?? 0) + 1)
  }
  for (const [type, n] of types) {
    const known = blockType(type) !== undefined
    lines.push({
      name: known ? nameOfType(type) : `Baustein „${type || 'ohne Art'}“`,
      detail: (n === 1 ? '' : `${n}-mal, `) + (known ? 'ohne gültigen Platz in der Maske' : 'diesem Editor unbekannt'),
    })
  }

  for (const [id, keys] of Object.entries(valuesKept(tree, left))) {
    lines.push({
      name: nameOfType(tree[id]?.type ?? ''),
      detail:
        keys.length === 1
          ? 'eine Einstellung ließ sich nicht ganz lesen'
          : `${keys.length} Einstellungen ließen sich nicht ganz lesen`,
    })
  }

  for (const [id, events] of Object.entries(part?.chains ?? {})) {
    const type = blockType(tree[id]?.type ?? '')
    for (const event of Object.keys(events)) {
      const named = capability(type, 'events')?.list.find((e) => e.key === event)?.name ?? event
      lines.push({ name: nameOfType(tree[id]?.type ?? ''), detail: `die Aktionen bei „${named}“` })
    }
  }

  for (const raw of part?.dataSources ?? []) lines.push({ name: `Datenquelle „${nameOf(raw)}“` })
  for (const raw of part?.relation ?? []) lines.push({ name: `Relation „${nameOf(raw)}“` })
  return lines
}

function typeOf(raw: unknown): string {
  const type = raw !== null && typeof raw === 'object' ? (raw as { type?: unknown }).type : undefined
  return typeof type === 'string' ? type : ''
}

function nameOfType(type: string): string {
  return blockType(type)?.name ?? (type || 'Baustein')
}

function nameOf(raw: unknown): string {
  const named = raw !== null && typeof raw === 'object' ? (raw as { name?: unknown }).name : undefined
  return typeof named === 'string' && named.trim() !== '' ? named.trim() : idOf(raw) || 'ohne Namen'
}
