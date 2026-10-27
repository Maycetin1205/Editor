import { useEffect, useRef, useState } from 'react'
import { DIALOG_EDGE, DIALOG_CLOSE_EVENT } from '../../blocks/dialog/DialogFrame'
import { blockType } from '../../core/block/registry'
import type { BlockNode } from '../../core/block/tree'
import type { EditorStore } from '../state/EditorStore'
import { useEditor } from '../state/useEditor'
import { BlockHost } from './BlockHost'
import { NodeList } from './NodeList'
import { useDnd } from './dndState'
import { pageDrop } from './gridDnd'
import { axesOf, sizeDrag, type Axis } from './sizeDrag'
import { Grip } from './Grip'
import { GRIPS } from './useBlockResize'

const POPUP_SIZE: Record<Axis, 'popupWidth' | 'popupHeight'> = { width: 'popupWidth', height: 'popupHeight' }

function popupNumber(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

interface PopupGripsProps {
  ed: EditorStore
  node: BlockNode
  width: number
  height: number
}

// The grips of a chosen popup, around the size it shows. A double click puts
// the side back to its declared size.
function PopupGrips({ ed, node, width, height }: PopupGripsProps) {
  const declared = blockType(node.type)?.properties ?? {}
  return (
    <div
      data-ff-editor-helper
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ width, height }}
    >
      {GRIPS.map((edge) => (
        <Grip
          key={edge}
          edge={edge}
          onDrag={(e) =>
            sizeDrag(ed, e, edge, { width, height }, (axis, value) =>
              ed.updateProperty(node.id, POPUP_SIZE[axis], value),
            )
          }
          onReset={() =>
            ed.history.transaction(() => {
              for (const axis of axesOf(edge)) {
                ed.updateProperty(node.id, POPUP_SIZE[axis], declared[POPUP_SIZE[axis]]?.default)
              }
            })
          }
        />
      ))}
    </div>
  )
}

export function PopupPage({ popupId }: { popupId: string }) {
  const ed = useEditor()
  const dnd = useDnd()

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [stage, setStage] = useState<{ b: number; h: number } | null>(null)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observers = new ResizeObserver(() => setStage({ b: el.clientWidth, h: el.clientHeight }))
    observers.observe(el)
    return () => observers.disconnect()
  }, [])

  // Closing the popup in the canvas goes back to the main page.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const toMainPage = (): void => {
      ed.setActivePage(ed.pages[0].id)
    }
    el.addEventListener(DIALOG_CLOSE_EVENT, toMainPage)
    return () => el.removeEventListener(DIALOG_CLOSE_EVENT, toMainPage)
  }, [ed])
  const node = ed.getNode(popupId)
  if (!node) return null
  const selected = ed.selectedId === node.id
  const width = popupNumber(node.values.popupWidth, 520)
  const height = popupNumber(node.values.popupHeight, 380)

  // No larger than the room the canvas has for it.
  const visibleWidth = stage ? Math.min(width, Math.max(40, stage.b - DIALOG_EDGE)) : width
  const visibleHeight = stage ? Math.min(height, Math.max(40, stage.h - DIALOG_EDGE)) : height

  return (
    <div ref={wrapRef} className="absolute inset-0" {...pageDrop(ed, dnd, node.id)}>
      <BlockHost block={node} selected={selected} onSelect={() => ed.selectBlock(node.id)}>
        <NodeList parentId={node.id} />
      </BlockHost>

      {selected && <PopupGrips ed={ed} node={node} width={visibleWidth} height={visibleHeight} />}
    </div>
  )
}
