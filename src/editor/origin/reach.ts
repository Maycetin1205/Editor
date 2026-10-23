import { blockName } from '../../core/block/blockName'
import { capability } from '../../core/block/capability'
import { listDefaultTitle } from '../../core/block/listBinding'
import { blockType } from '../../core/block/registry'
import type { BlockNode, MaskTree } from '../../core/block/tree'
import {
  captureCarrierInTree,
  changeCarrierInTree,
  selectionGiverInTree,
  selectionSourceIdOf,
  valueSpotsInTree,
} from '../../core/block/treeQuery'
import type { DataSource } from '../../core/data/dataSources'
import { splitsFrom } from '../../core/data/split'
import type { ResultStep } from '../../core/data/steps/chains'

export interface ReachEntry {
  value: string
  name: string
  badge?: string
}

export interface ReachGroup {
  id: string
  name: string
  entries: readonly ReachEntry[]
}

interface FormField {
  blockId: string
  prop: string
  name: string
}

export interface Reach {
  events?: boolean

  row?: readonly ReachEntry[]
  helpers?: readonly ReachGroup[]
  document?: ReachGroup
  sources?: readonly DataSource[]
  formFields?: readonly FormField[]

  givers?: readonly ReachGroup[]
  captures?: readonly ReachGroup[]
  changes?: readonly ReachGroup[]
  splits?: readonly ReachGroup[]
  steps?: readonly ResultStep[]

  sums?: readonly ReachGroup[]
}

export const fieldEntries = (source: DataSource | undefined): ReachEntry[] =>
  (source?.fields ?? []).map((f) => ({ value: f.code, name: f.name || f.code, badge: f.code }))

export const sourceGroup = (source: DataSource): ReachGroup => ({
  id: source.id,
  name: source.name,
  entries: fieldEntries(source),
})

export const openDocumentOf = (library: readonly DataSource[]): DataSource | undefined =>
  library.find((s) => s.preset === 'document')

export function columnEntries(node: BlockNode): ReachEntry[] {
  const binding = capability(blockType(node.type), 'list')?.binding
  const keyOf = binding?.keyOf
  if (!binding || keyOf === undefined) return []
  return binding.entries(node.values[binding.prop]).flatMap((entry, i) => {
    const key = keyOf(entry)
    if (key === '') return []
    const title = binding.titleOf(entry)
    return [{ value: key, name: title !== '' ? title : listDefaultTitle(binding, i) }]
  })
}

export function formFieldsOf(tree: MaskTree, sources: readonly DataSource[]): FormField[] {
  const all = valueSpotsInTree(tree).map(({ node, spot }) => {
    const name = blockName(node, sources)
    const several = (capability(blockType(node.type), 'actionValue')?.spots.length ?? 0) > 1
    return { blockId: node.id, prop: spot.prop, name: several ? `${name} — ${spot.name}` : name }
  })
  return all.map((f) => {
    const same = all.filter((o) => o.name === f.name)
    return same.length > 1 ? { ...f, name: `${f.name} ${same.indexOf(f) + 1}` } : f
  })
}

export function giverGroup(node: BlockNode, sources: readonly DataSource[]): ReachGroup {
  const source = sources.find((s) => s.id === selectionSourceIdOf(node))
  const name = blockName(node, sources)
  return { id: node.id, name: source ? `${name} (${source.name})` : name, entries: fieldEntries(source) }
}

const rowsGroup = (node: BlockNode, sources: readonly DataSource[]): ReachGroup => ({
  id: node.id,
  name: blockName(node, sources),
  entries: columnEntries(node),
})

const SPLIT_AMOUNT_NAME = 'Verteilte Menge'

function splitGroups(tree: MaskTree, sources: readonly DataSource[]): ReachGroup[] {
  return captureCarrierInTree(tree).flatMap((node) => {
    const split = splitsFrom(node.values.splits)[0]
    if (split === undefined) return []
    const source = sources.find((s) => s.id === split.sourceId)
    const name = blockName(node, sources)
    return [
      {
        id: node.id,
        name: source ? `${name} (${source.name})` : name,
        entries: [{ value: '', name: SPLIT_AMOUNT_NAME }, ...fieldEntries(source)],
      },
    ]
  })
}

export function maskReach(tree: MaskTree, sources: readonly DataSource[]): Reach {
  return {
    events: true,
    sources,
    formFields: formFieldsOf(tree, sources),
    givers: selectionGiverInTree(tree).map((node) => giverGroup(node, sources)),
    captures: captureCarrierInTree(tree).map((node) => rowsGroup(node, sources)),
    changes: changeCarrierInTree(tree).map((node) => rowsGroup(node, sources)),
    splits: splitGroups(tree, sources),
  }
}

export function calculationReach(tree: MaskTree, sources: readonly DataSource[]): Reach {
  return {
    givers: selectionGiverInTree(tree).map((node) => giverGroup(node, sources)),
    sums: captureCarrierInTree(tree).map((node) => rowsGroup(node, sources)),
  }
}

export function sourceReach(sources: readonly DataSource[], exceptId: string): Reach {
  return { sources: sources.filter((s) => s.id !== exceptId) }
}

export function outsideReach(
  library: readonly DataSource[],
  formFields: readonly FormField[],
): Pick<Reach, 'document' | 'formFields'> {
  const openDocument = openDocumentOf(library)
  return { ...(openDocument ? { document: sourceGroup(openDocument) } : {}), formFields }
}
