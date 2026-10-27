import { ROOT_ID, type BlockNode, type MaskTree } from '../block/tree'
import { relationIdsOf } from '../block/treeQuery'
import { sourceIdsUsedBy } from '../block/sourcesInReach'
import type { DataSource } from './dataSources'
import { deliveryAdapter } from './deliveries/deliveries'
import type { RelationTemplate } from './relations'

// Which sources and relations a mask uses. Saving keeps them in the mask
// file, the export writes them into the mask.

export function fieldsReadBy(source: DataSource): { sourceId: string; code: string }[] {
  const out: { sourceId: string; code: string }[] = []
  for (const binding of deliveryAdapter(source.delivery.kind).bindings(source.delivery)) {
    if (binding.source !== 'dataField') continue
    const sourceId = binding.sourceId ?? ''
    if (sourceId !== '') out.push({ sourceId, code: binding.value })
  }
  return out
}

export function collectDataSources(tree: MaskTree, sources: readonly DataSource[]): DataSource[] {
  const seen = new Set<string>()
  const acc: DataSource[] = []
  const add = (id: string): void => {
    const src = sources.find((s) => s.id === id)
    if (src && !seen.has(src.id)) {
      seen.add(src.id)
      acc.push(src)
    }
  }
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    for (const id of sourceIdsUsedBy(node)) add(id)
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[ROOT_ID])

  for (let i = 0; i < acc.length; i++) {
    for (const { sourceId } of fieldsReadBy(acc[i])) add(sourceId)
  }
  return acc
}

export function collectRelation(
  tree: MaskTree,
  relation: readonly RelationTemplate[],

  sources: readonly DataSource[] = [],
): RelationTemplate[] {
  const seen = new Set<string>()
  const acc: RelationTemplate[] = []
  const add = (id: string): void => {
    const rel = relation.find((r) => r.id === id)
    if (!rel || seen.has(rel.id)) return
    seen.add(rel.id)
    acc.push(rel)
  }
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    for (const id of relationIdsOf(node)) add(id)
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[ROOT_ID])
  for (const source of sources) {
    for (const id of deliveryAdapter(source.delivery.kind).relationIds(source.delivery)) add(id)
  }
  return acc
}
