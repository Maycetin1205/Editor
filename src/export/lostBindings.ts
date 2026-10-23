import type { MaskTree } from '../core/block/tree'
import { bindingProp } from '../core/block/capability'
import { bindingFields, splitBinding } from '../core/block/binding'
import { blockType } from '../core/block/registry'
import { sourcesInReach } from '../core/block/sourcesInReach'
import { bindableSpotsOf } from '../core/block/treeQuery'
import { boundField, sourceInReachOf } from '../core/data/boundField'
import type { DataSource } from '../core/data/dataSources'

export interface LostBinding {
  blockName: string
  code: string
  sourceName: string
}

export function lostBindings(tree: MaskTree, library: readonly DataSource[]): LostBinding[] {
  const lost: LostBinding[] = []
  for (const node of Object.values(tree)) {
    const spots = bindableSpotsOf(node)
    if (spots.length === 0) continue
    const sources = sourcesInReach(tree, node.id, library)
    for (const spot of spots) {
      const value = node.values[bindingProp(spot.prop)]
      if (typeof value !== 'string' || value === '') continue
      for (const binding of bindingFields(value)) {
        if (boundField(binding, sources)) continue
        lost.push({
          blockName: blockType(node.type)?.name ?? node.type,
          code: splitBinding(binding).code,
          sourceName: sourceInReachOf(binding, sources)?.name ?? '',
        })
      }
    }
  }
  return lost
}
