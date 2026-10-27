import { cn } from '@/editor/widgets/cn'
import { FoldButton, FoldedColumn, type FoldTab } from '@/editor/widgets/Folded'
import type { SideTab } from '../state/editorStore/viewState'
import { useEditorInstance } from '../state/EditorContext'
import { useStoreSelect } from '../state/useStoreSelect'
import { MasksTab } from '../masks/MasksTab'
import { BlockPalette } from './BlockPalette'

const TABS: readonly FoldTab<SideTab>[] = [
  { key: 'blocks', name: 'Bausteine' },
  { key: 'masks', name: 'Masken' },
]

export function Sidebar() {
  const view = useEditorInstance().view
  const shut = useStoreSelect(view, (v) => v.isShut('left'))
  const sideTab = useStoreSelect(view, (v) => v.sideTab)
  if (shut) {
    return <FoldedColumn side="left" tabs={TABS} onOpen={(tab) => view.showSide(tab)} />
  }
  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-line bg-ground">
      <nav className="flex h-[40px] shrink-0 items-stretch gap-[20px] border-b border-line pl-[16px] pr-[7px]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={sideTab === t.key}
            title={sideTab === t.key ? 'Spalte einklappen' : undefined}
            onClick={() => (sideTab === t.key ? view.shutColumn('left', true) : view.showSide(t.key))}
            className={cn(
              'text-rubric font-bold transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
              sideTab === t.key ? 'text-ink shadow-tab' : 'text-muted hover:text-ink',
            )}
          >
            {t.name}
          </button>
        ))}
        <span className="ml-auto flex items-center">
          <FoldButton side="left" onFold={() => view.shutColumn('left', true)} />
        </span>
      </nav>
      <div className="flex min-h-0 flex-1 flex-col">{sideTab === 'blocks' ? <BlockPalette /> : <MasksTab />}</div>
    </aside>
  )
}
