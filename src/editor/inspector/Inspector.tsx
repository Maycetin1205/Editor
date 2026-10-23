import { useCallback, useMemo, useState } from 'react'
import { FoldButton, FoldedColumn, type FoldTab } from '@/editor/widgets/Folded'
import { blockType } from '../../core/block/registry'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { BlockProperties } from './BlockProperties'
import { MaskProperties } from './MaskProperties'
import type { Folds } from './Sections'

const TABS: readonly FoldTab<'properties'>[] = [{ key: 'properties', name: 'Eigenschaften' }]

export function Inspector() {
  const ed = useEditor()
  const view = useView()
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = useCallback((name: string) => setFolded((before) => {
    const next = new Set(before)
    if (!next.delete(name)) next.add(name)
    return next
  }), [])
  const folds = useMemo<Folds>(() => ({ folded: (name) => folded.has(name), toggle }), [folded, toggle])

  if (view.isShut('right')) {
    return <FoldedColumn side="right" tabs={TABS} onOpen={() => view.shutColumn('right', false)} />
  }

  const block = ed.selectedNode
  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-line bg-ground" data-ff-inspector>
      <div className="flex h-[40px] shrink-0 items-center border-b border-line pr-[7px]">
        <button
          type="button"
          title="Spalte einklappen"
          onClick={() => view.shutColumn('right', true)}
          className="flex h-full flex-1 items-center pl-[16px] text-left text-rubric font-bold text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        >
          Eigenschaften
        </button>
        <FoldButton side="right" onFold={() => view.shutColumn('right', true)} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {block === null
          ? <MaskProperties />
          : (
              <BlockProperties
                key={block.id}
                block={block}
                def={blockType(block.type)}
                folds={folds}
                onRemove={() => ed.removeBlock(block.id)}
              />
            )}
        <div className="flex-1 border-t border-line" />
      </div>
    </aside>
  )
}
