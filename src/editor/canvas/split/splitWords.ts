import { blockType, declaredValue } from '../../../core/block/registry'
import type { BlockNode } from '../../../core/block/tree'
import type { DataSource } from '../../../core/data/dataSources'
import { splitsProperty } from '../../../core/data/split'

export function carriesSplit(block: BlockNode): boolean {
  return Object.values(blockType(block.type)?.properties ?? {}).includes(splitsProperty)
}

export function splitWords(block: BlockNode, library: readonly DataSource[]): string {
  const split = declaredValue(block, splitsProperty)[0]
  if (split === undefined) return 'Keins'
  return library.find((s) => s.id === split.sourceId)?.name ?? 'Quelle fehlt'
}
