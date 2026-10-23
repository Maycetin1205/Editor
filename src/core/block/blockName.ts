import { bindingFields } from './binding'
import type { BlockNode } from './tree'
import { defaultsOf } from './property'
import { bindingProp } from './capability'
import { blockType } from './registry'
import { ownText } from './ownText'
import { bindableSpotsOf } from './treeQuery'
import { ownSourcesOf } from './sourcesInReach'
import { boundField } from '../data/boundField'
import type { DataSource } from '../data/dataSources'

function coveredProps(node: BlockNode): Set<string> {
  const out = new Set<string>()
  for (const spot of bindableSpotsOf(node)) {
    const binding = String(node.values[bindingProp(spot.prop)] ?? '')
    if (binding !== '') out.add(spot.previewProp ?? spot.prop)
  }
  return out
}

function boundAlias(node: BlockNode, library: readonly DataSource[]): string {
  const sources = ownSourcesOf(node, library)
  for (const spot of bindableSpotsOf(node)) {
    const binding = String(node.values[bindingProp(spot.prop)] ?? '')
    for (const field of bindingFields(binding)) {
      const alias = boundField(field, sources)?.name ?? ''
      if (alias !== '') return alias
    }
  }
  return ''
}

export function blockName(node: BlockNode, sources: readonly DataSource[]): string {
  const def = blockType(node.type)
  const text = ownText(node.values, def && defaultsOf(def.properties), coveredProps(node))
  if (text !== '') return text
  const alias = boundAlias(node, sources)
  if (alias !== '') return alias
  return def?.name ?? node.type
}
