import type { RefObject } from 'react'
import type { BlockType } from '../../core/block/blockType'
import { gridMetricsOf } from '../../core/block/grid'
import type { BlockNode } from '../../core/block/tree'
import type { EditorStore } from '../state/EditorStore'
import { Grip } from './Grip'
import { GRIPS, useBlockResize } from './useBlockResize'

interface BlockGripsProps {
  editor: EditorStore
  def: BlockType | undefined
  blockRef: RefObject<BlockNode>
  rootRef: RefObject<HTMLElement | null>
}

// The grips of a chosen block in a grid area. A block whose height follows
// its content or never changes only gets the side grips.
export function BlockGrips({ editor, def, blockRef, rootRef }: BlockGripsProps) {
  const { gridResize, resetGridSize } = useBlockResize(editor, blockRef, rootRef)
  const spec = gridMetricsOf(def)
  return GRIPS.filter((edge) => !(spec.heightFixed || spec.heightFromContent) || edge === 'e' || edge === 'w').map(
    (edge) => <Grip key={edge} edge={edge} onDrag={(e) => gridResize(e, edge)} onReset={() => resetGridSize(edge)} />,
  )
}
