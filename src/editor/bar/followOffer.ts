import type { BlockNode, MaskTree } from '../../core/block/tree'
import { blockName } from '../../core/block/blockName'
import { capability } from '../../core/block/capability'
import { blockType, declaredValue } from '../../core/block/registry'
import { isSelectionGiver, selectionSourceIdOf, valueSpotsInTree } from '../../core/block/treeQuery'
import type { DataSource } from '../../core/data/dataSources'
import { deliveryAdapter } from '../../core/data/deliveries/deliveries'
import { followsSelectionProperty, type SelectionFollow } from '../../core/data/selectionFollow'
import { openDocumentOf } from '../origin/reach'

export function followOf(block: BlockNode): SelectionFollow | undefined {
  return declaredValue(block, followsSelectionProperty)[0]
}

function giversFor(tree: Readonly<MaskTree>, block: BlockNode): BlockNode[] {
  return Object.values(tree).filter((n) => n.id !== block.id && isSelectionGiver(n))
}

export function followOffered(tree: Readonly<MaskTree>, block: BlockNode, library: readonly DataSource[]): boolean {
  return (
    followOf(block) !== undefined ||
    giversFor(tree, block).length > 0 ||
    valueSpotsInTree(tree).some(({ node }) => node.id !== block.id) ||
    openDocumentOf(library) !== undefined
  )
}

function followOn(block: BlockNode, giverId: string, library: readonly DataSource[]): SelectionFollow[] {
  const before = followOf(block)
  const own = library.find((s) => s.id === selectionSourceIdOf(block))
  const fetches = own !== undefined && deliveryAdapter(own.delivery.kind).fetchOn === 'selection'
  const pairs = before?.giverId === giverId ? before.pairs : []
  return [{ giverId, pairs: fetches || pairs.length > 0 ? pairs : [{ fromField: '', toField: '' }] }]
}

function followOnFormField(block: BlockNode, fieldId: string, prop: string): SelectionFollow[] {
  const before = followOf(block)
  if (before?.giverId === '' && before.pairs.some((p) => p.from === 'formField' && p.fromField === fieldId))
    return [before]
  return [{ giverId: '', pairs: [{ fromField: fieldId, toField: '', from: 'formField', fromProp: prop }] }]
}

export function followOnDocument(block: BlockNode, sourceId: string): SelectionFollow[] {
  const before = followOf(block)
  if (before?.giverId === '' && before.pairs.some((p) => p.from === 'document')) return [before]
  return [{ giverId: '', pairs: [{ fromField: '', toField: '', from: 'document', fromSourceId: sourceId }] }]
}

const valueSpotOf = (node: BlockNode) => capability(blockType(node.type), 'actionValue')?.spots[0]

export function followableByClick(clicked: BlockNode, followerId: string): boolean {
  return clicked.id !== followerId && (isSelectionGiver(clicked) || valueSpotOf(clicked) !== undefined)
}

export function followByClick(
  follower: BlockNode,
  clicked: BlockNode,
  library: readonly DataSource[],
): SelectionFollow[] | null {
  if (!followableByClick(clicked, follower.id)) return null
  if (isSelectionGiver(clicked)) return followOn(follower, clicked.id, library)
  const spot = valueSpotOf(clicked)
  return spot ? followOnFormField(follower, clicked.id, spot.prop) : null
}

export function followedName(
  follow: SelectionFollow,
  tree: Readonly<MaskTree>,
  library: readonly DataSource[],
): string {
  const giver = tree[follow.giverId]
  if (giver) return blockName(giver, library)
  const pair = follow.pairs[0]
  if (pair?.from === 'formField') {
    const field = tree[pair.fromField]
    return field ? blockName(field, library) : ''
  }
  if (pair?.from === 'document') return library.find((s) => s.id === pair.fromSourceId)?.name ?? ''
  return ''
}
