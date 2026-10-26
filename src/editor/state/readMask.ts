import { capability } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import type { MaskTree } from '../../core/block/tree'
import { checkDataSources, type DataSource } from '../../core/data/dataSources'
import { checkRelationTemplates, type RelationTemplate } from '../../core/data/relations'
import type { NoticeLine } from '../widgets/Notice'
import { checkTreeState, type Missed } from './checkTreeState'
import { chainKey, idOf, withLeftover, type Known, type Leftover, type SourceLeft } from './leftover'
import { currentState } from './maskSchema'

interface MaskRead {
  tree: MaskTree
  selectedId: string | null
  activePageId: unknown
  dataSources: DataSource[]
  relation: RelationTemplate[]
  leftover: Leftover
  lines: NoticeLine[]
}

type MaskReadResult = { ok: true; read: MaskRead } | { ok: false; why: 'stage' | 'root' }

// Reads the state of a mask as a file or the browser holds it. Whatever this
// editor cannot read goes into the leftover; lines name what of it is new,
// that is not already kept aside by an earlier save.
export function readMask(raw: Record<string, unknown>): MaskReadResult {
  const { state, known } = withLeftover(raw, raw.leftover)
  const o = currentState(state)
  if (o === null) return { ok: false, why: 'stage' }

  const t = checkTreeState({ tree: o.tree, selectedId: o.selectedId })
  if (t === null) return { ok: false, why: 'root' }

  const sourcesLeft: SourceLeft[] = []
  const dataSources = checkDataSources(o.dataSources, (entry, readAs) => {
    sourcesLeft.push(readAs === undefined ? { raw: entry } : { raw: entry, readAs })
  })
  const relation = checkRelationTemplates(o.relation)
  const taken = new Set(relation.map((r) => r.id))
  const relationLeft = (Array.isArray(o.relation) ? (o.relation as unknown[]) : []).filter(
    (entry) => !taken.has(idOf(entry)),
  )

  return {
    ok: true,
    read: {
      tree: t.tree,
      selectedId: t.selectedId,
      activePageId: o.activePageId,
      dataSources,
      relation,
      leftover: { ...t.leftover, dataSources: sourcesLeft, relation: relationLeft },
      lines: [
        ...missedLines(t.missed, known),
        ...sourcesLeft
          .filter(({ raw, readAs }) => readAs === undefined && !known.dataSources.has(idOf(raw)))
          .map(({ raw }) => ({ name: `Datenquelle „${nameOf(raw)}“`, detail: 'ließ sich nicht lesen' })),
        ...relationLeft
          .filter((entry) => !known.relation.has(idOf(entry)))
          .map((entry) => ({ name: `Relation „${nameOf(entry)}“`, detail: 'ließ sich nicht lesen' })),
      ],
    },
  }
}

function nameOf(raw: unknown): string {
  const named = raw !== null && typeof raw === 'object' ? (raw as { name?: unknown }).name : undefined
  return typeof named === 'string' && named.trim() !== '' ? named.trim() : idOf(raw) || 'ohne Namen'
}

function blockName(type: string): string {
  return blockType(type)?.name ?? type
}

function missedLines(missed: readonly Missed[], known: Known): NoticeLine[] {
  const lines: NoticeLine[] = []
  const types = new Map<string, number>()
  let lost = 0
  for (const m of missed) {
    if (m.kind === 'chain' ? known.chains.has(chainKey(m.id, m.event)) : known.nodes.has(m.id)) continue
    if (m.kind === 'type') {
      types.set(m.type, (types.get(m.type) ?? 0) + 1)
    } else if (m.kind === 'place') {
      lines.push({ name: blockName(m.type), detail: `darf nicht in „${blockName(m.parentType)}“ stehen` })
    } else if (m.kind === 'chain') {
      const event = capability(blockType(m.type), 'events')?.list.find((e) => e.key === m.event)?.name ?? m.event
      lines.push({ name: blockName(m.type), detail: `die Aktionen bei „${event}“ ließen sich nicht lesen` })
    } else {
      lost++
    }
  }
  const unknown = [...types].map(([type, n]) => ({
    name: `Baustein „${type}“`,
    detail: n === 1 ? 'diesem Editor unbekannt' : `${n}-mal, diesem Editor unbekannt`,
  }))
  const placeless =
    lost === 0
      ? []
      : [
          {
            name: lost === 1 ? 'Ein Baustein' : `${lost} Bausteine`,
            detail: 'ohne gültigen Platz in der Maske',
          },
        ]
  return [...unknown, ...lines, ...placeless]
}
