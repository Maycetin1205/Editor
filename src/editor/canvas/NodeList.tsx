import { memo } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { gridSlotRead, gridSlotStyle, type GridSlot } from '../../core/block/grid'
import { areaColumnsStyle } from '../../core/block/gridArea'
import { sourcesCarrier } from '../../core/block/sourcesInReach'
import { useEditorInstance, useEditorSelect } from '../state/useEditor'
import type { EditorStore } from '../state/EditorStore'
import { sameFields, sameItems } from '../state/useStoreSelect'
import { BlockHost } from './BlockHost'
import { useDnd, useDndSelect } from './dndState'
import { positionDrag } from './positionDrag'
import { usePointerDrag } from './pointerDrag'

function GridGhost({ slot, free }: { slot: GridSlot; free: boolean }) {
  const tone = free ? '--wb-selection' : '--wb-error'
  return (
    <div
      aria-hidden
      data-ff-editor-helper
      style={{
        ...gridSlotStyle(slot),
        position: 'relative',
        zIndex: 40,
        pointerEvents: 'none',
        background: `color-mix(in srgb, var(${tone}) 10%, transparent)`,
        border: `2px dashed var(${tone})`,
        borderRadius: 'var(--radius)',
      }}
    />
  )
}

// The blocks of one area. It draws again when its blocks change, not on
// every change of the mask; each block draws on its own (CanvasNode).
export const NodeList = memo(function NodeList({ parentId }: { parentId: string }) {
  const nodes = useEditorSelect((e) => e.childNodesOf(parentId), sameItems)

  const ghost = useDndSelect((d) => (d.dropTarget !== null && d.dropTarget.parentId === parentId ? d.dropTarget : null))

  return (
    <>
      {nodes.map((node) => (
        <CanvasNode key={node.id} node={node} parentId={parentId} />
      ))}
      {ghost && <GridGhost slot={ghost} free={ghost.free} />}
    </>
  )
})

function underChosen(ed: EditorStore, parentId: string): boolean {
  let id: string | null = parentId
  while (id !== null && id !== ed.rootId) {
    if (ed.selectedId === id) return true
    id = ed.getNode(id)?.parentId ?? null
  }
  return false
}

// What a block on the canvas draws from besides itself: whether it is chosen
// and the block that carries its sources (BlockHost reads that from the
// tree). The chosen block also draws on every change of the mask: its open
// bars read the rest of it.
interface NodeLook {
  selected: boolean
  carrier: BlockNode | undefined
  version: number
  chosenChild: number
}

// The place of the child of a block that holds the choice, -1 when none does:
// a Reiter shows the page with the chosen block.
function chosenChildOf(e: EditorStore, id: string): number {
  let cur = e.selectedId === null ? undefined : e.getNode(e.selectedId)
  while (cur && cur.parentId !== id) cur = cur.parentId === null ? undefined : e.getNode(cur.parentId)
  return cur ? e.childNodesOf(id).findIndex((child) => child.id === cur.id) : -1
}

function nodeLook(e: EditorStore, id: string): NodeLook {
  const selected = e.selectedId === id
  const holds = blockType(e.getNode(id)?.type ?? '')?.takesChildren === true
  return {
    selected,
    carrier: sourcesCarrier(e.tree, id),
    version: selected ? e.version : 0,
    chosenChild: holds ? chosenChildOf(e, id) : -1,
  }
}

const FILLS_STYLE = { minWidth: 0, minHeight: 0 }

// The place of a block on the canvas: it follows the pointer while carried,
// and only then draws again on a move.
const CanvasNode = memo(function CanvasNode({ node, parentId }: { node: BlockNode; parentId: string }) {
  const ed = useEditorInstance()
  const dnd = useDnd()
  const drag = usePointerDrag()
  const look = useEditorSelect((e) => nodeLook(e, node.id), sameFields)
  const carried = useDndSelect((d) => (d.dragId === node.id ? d.dragOffset : null))
  // A page of a Reiter has no slot of its own: it neither moves nor sizes.
  const fills = blockType(node.type)?.fillsParent === true

  return (
    <div
      onPointerDown={(e) => {
        if (fills || underChosen(ed, parentId)) return
        drag(e, positionDrag(ed, dnd, e, node, parentId))
      }}
      style={{
        ...(fills ? FILLS_STYLE : gridSlotStyle(gridSlotRead(node.values))),
        ...areaColumnsStyle(node),
        ...(carried
          ? {
              position: 'relative' as const,
              zIndex: 50,
              pointerEvents: 'none' as const,
              opacity: 0.9,
              transform: `translate(${carried.dx}px, ${carried.dy}px)`,
              filter: 'drop-shadow(0 8px 20px color-mix(in srgb, var(--wb-ink) 18%, transparent))',
            }
          : {}),
      }}
    >
      <CanvasBlock node={node} look={look} />
    </div>
  )
})

const CanvasBlock = memo(function CanvasBlock({ node, look }: { node: BlockNode; look: NodeLook }) {
  const ed = useEditorInstance()
  const def = blockType(node.type)
  const isContainer = def?.takesChildren ?? false
  return (
    <BlockHost
      block={node}
      selected={look.selected}
      onSelect={() => ed.chooseHit(node.id)}
      grid={def?.fillsParent !== true}
      chosenChild={look.chosenChild}
    >
      {isContainer && <NodeList parentId={node.id} />}
    </BlockHost>
  )
})
