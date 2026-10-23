import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { gridSlotRead, gridSlotStyle, type GridSlot } from '../../core/block/grid'
import { areaColumnsStyle } from '../../core/block/gridArea'
import { useEditor } from '../state/useEditor'
import { BlockHost } from './BlockHost'
import { useDnd } from './dndState'
import { dragPosition } from './dragPosition'

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

export function NodeList({ parentId }: { parentId: string }) {
  const ed = useEditor()
  const dnd = useDnd()

  const nodes = ed.childNodesOf(parentId)

  const ghost = dnd.dropTarget !== null && dnd.dropTarget.parentId === parentId ? dnd.dropTarget : null

  return (
    <>
      {nodes.map((node) => <CanvasNode key={node.id} node={node} parentId={parentId} />)}
      {ghost && <GridGhost slot={ghost} free={ghost.free} />}
    </>
  )
}

function underChosen(ed: ReturnType<typeof useEditor>, parentId: string): boolean {
  let id: string | null = parentId
  while (id !== null && id !== ed.rootId) {
    if (ed.selectedId === id) return true
    id = ed.getNode(id)?.parentId ?? null
  }
  return false
}

function CanvasNode({ node, parentId }: { node: BlockNode; parentId: string }) {
  const ed = useEditor()
  const dnd = useDnd()
  const isContainer = blockType(node.type)?.takesChildren ?? false
  const carried = dnd.dragId === node.id ? dnd.dragOffset : null

  return (
    <div
      onPointerDown={(e) => {
        if (underChosen(ed, parentId)) return
        dragPosition(ed, dnd, e, node, parentId)
      }}
      style={{
        ...gridSlotStyle(gridSlotRead(node.values)),
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
      <BlockHost
        block={node}
        selected={ed.selectedId === node.id}
        onSelect={() => ed.chooseHit(node.id)}
        grid
      >
        {isContainer && <NodeList parentId={node.id} />}
      </BlockHost>
    </div>
  )
}
