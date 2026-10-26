import type { ReactNode } from 'react'
import { Plus } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { LINE_HOVER } from '@/editor/widgets/lineLook'
import type { BlockNode } from '../../core/block/tree'
import { useEditor } from '../state/useEditor'
import { EventChain } from './ActionsSection'
import { useStepContext } from './useStepContext'
import { claimEntryKey, entryChainsOf, entryEventsOf, type EntryChain } from './entryEvents'
import { NEW_STEP_TAB } from './stepRegistry'

const titleOf = (entry: EntryChain): string => (entry.title === '' ? `Zeile ${entry.index + 1}` : `„${entry.title}“`)

// Each line of the list with a chain of its own: a line that has steps shows
// them, the others wait in one quiet list for their first step.
export function EntryActions({ block }: { block: BlockNode }) {
  const ed = useEditor()
  const context = useStepContext()
  const at = entryEventsOf(block)
  if (!at) return null

  const parts: ReactNode[] = []
  let quiet: EntryChain[] = []
  const flush = (): void => {
    if (quiet.length === 0) return
    const rows = quiet
    parts.push(
      <div key={`quiet-${rows[0].index}`} className="overflow-hidden rounded border border-line">
        {rows.map((entry) => (
          <button
            key={entry.index}
            type="button"
            onClick={() => {
              const key = claimEntryKey(ed, block.id, entry.index)
              if (key !== null) ed.view.openStep({ blockId: block.id, eventKey: key, stepId: null, tab: NEW_STEP_TAB })
            }}
            className={cn(
              'group flex h-[30px] w-full items-center gap-[8px] border-b border-line-soft px-[8px] text-left last:border-b-0',
              LINE_HOVER,
            )}
          >
            <span className="min-w-0 flex-1 truncate">{titleOf(entry)}</span>
            <span className="flex shrink-0 items-center gap-[4px] text-dense text-muted group-hover:text-ink">
              <Plus size={12} className="text-accent" /> Schritt
            </span>
          </button>
        ))}
      </div>,
    )
    quiet = []
  }

  for (const entry of entryChainsOf(block)) {
    const steps = entry.key === undefined ? 0 : (block.chains?.[entry.key]?.length ?? 0)
    if (entry.key === undefined || steps === 0) {
      quiet.push(entry)
      continue
    }
    flush()
    parts.push(
      <EventChain
        key={entry.key}
        block={block}
        ev={{ key: entry.key, name: `${titleOf(entry)} ${at.events.name}` }}
        context={context}
      />,
    )
  }
  flush()

  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-dense text-muted">
        Ein Klick auf eine Zeile in der Maske startet ihre Schritte, zum Beispiel ein Werkzeug von SoftEngine.
      </p>
      {parts}
    </div>
  )
}
