import type { MaskTree } from '../core/block/tree'
import type { DataSource } from '../core/data/dataSources'
import { deliveryAdapter } from '../core/data/deliveries/deliveries'
import type { RelationTemplate } from '../core/data/relations'
import { collectDataSources } from '../core/data/usedByMask'

export function sourcesWithoutRelation(
  tree: MaskTree,
  relation: readonly RelationTemplate[],
  sources: readonly DataSource[],
): string[] {
  const held = new Set(relation.map((r) => r.id))
  return collectDataSources(tree, sources)
    .filter((s) =>
      deliveryAdapter(s.delivery.kind)
        .relationIds(s.delivery)
        .some((id) => !held.has(id)),
    )
    .map((s) => s.name)
}
