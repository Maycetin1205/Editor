import { Component } from '@/editor/icons/icon'
import { createElement, Fragment } from 'react'
import { cn } from '@/editor/widgets/cn'
import { LINE_CHOSEN, LINE_HOVER } from '@/editor/widgets/lineLook'
import { ROOT_ID, ROOT_TYPE } from '../../core/block/tree'
import { mayContain, allBlockTypes } from '../../core/block/registry'
import type { Category, BlockType } from '../../core/block/blockType'
import { BLOCK_ICONS } from '../blockIcons'
import { setNewBlockDrag } from '../canvas/dnd'
import { capacityOf } from '../canvas/gridArea'
import { useEditor } from '../state/useEditor'

function symbolOf(type: string) {
  return BLOCK_ICONS[type] ?? Component
}

const CATEGORY_ORDER: Category[] = ['layout', 'input', 'display']

export function BlockPalette() {
  const ed = useEditor()

  const definitions = allBlockTypes()
    .filter((d) => d.inPalette !== false)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
  const markedType = ed.selectedNode?.type ?? null

  const insertParentFor = (type: string): string | undefined => {
    let cur = ed.selectedId ? ed.getNode(ed.selectedId) : null
    while (cur) {
      if (mayContain(cur.type, type)) return cur.id
      cur = cur.parentId ? ed.getNode(cur.parentId) : null
    }

    const activePage = ed.getNode(ed.rootId)
    if (activePage && !mayContain(activePage.type, type) && mayContain(ROOT_TYPE, type)) {
      return ROOT_ID
    }
    return undefined
  }

  return (
    <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-[8px]">
      {definitions.map((def, i) => (
        <Fragment key={def.type}>
          {i > 0 && definitions[i - 1].category !== def.category && (
            <span aria-hidden className="mx-[10px] my-[6px] h-px shrink-0 bg-line" />
          )}
          <PaletteItem
            def={def}
            marked={def.type === markedType}
            onAdd={() => {
              const parentId = insertParentFor(def.type)
              if (ed.addBlock(def.type, parentId, undefined, capacityOf(ed.tree, parentId))) return
              // The chosen area is full: the page takes the block, or says why not.
              const onPage = parentId !== undefined && parentId !== ed.rootId && parentId !== ROOT_ID
              if (onPage && ed.addBlock(def.type, undefined, undefined, capacityOf(ed.tree, undefined))) return
              ed.view.showNotice({
                title: 'Kein Platz',
                lead: `„${def.name}“ passt nicht mehr ${onPage ? 'in den gewählten Bereich und nicht ' : ''}auf die Seite. Platz schaffen oder einen anderen Bereich wählen.`,
              })
            }}
          />
        </Fragment>
      ))}
    </nav>
  )
}

interface PaletteItemProps {
  def: BlockType
  marked: boolean
  onAdd: () => void
}

function PaletteItem({ def, marked, onAdd }: PaletteItemProps) {
  return (
    <button
      type="button"
      aria-label={`${def.name} einfügen`}
      onClick={onAdd}
      draggable
      onDragStart={(e) => {
        setNewBlockDrag(e.dataTransfer, def.type)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className={cn(
        'flex h-[34px] w-full min-w-0 shrink-0 items-center gap-[11px] rounded px-[10px] text-left text-ui font-semibold text-ink-2 transition-colors',
        'hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
        marked ? LINE_CHOSEN : LINE_HOVER,
      )}
    >
      {createElement(symbolOf(def.type), { size: 18, className: 'shrink-0 text-muted', 'aria-hidden': true })}
      <span className="min-w-0 truncate">{def.name}</span>
    </button>
  )
}
