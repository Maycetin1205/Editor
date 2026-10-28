import { useState, type DragEvent } from 'react'
import { Plus, X } from '../icons/icon'
import { cn } from '../widgets/cn'

export const SOURCE_DRAG = 'application/x-aufbau-quelle'

export interface SourceTab {
  name: string
  count: number
  own: boolean
}

interface Naming {
  was: string | null
  text: string
}

const carriesSource = (e: DragEvent): boolean => e.dataTransfer.types.includes(SOURCE_DRAG)

function NameInput({
  label,
  text,
  onText,
  onDone,
  onCancel,
}: {
  label: string
  text: string
  onText: (text: string) => void
  onDone: () => void
  onCancel: () => void
}) {
  return (
    <span className="flex items-center px-[4px]">
      <input
        autoFocus
        aria-label={label}
        value={text}
        onChange={(e) => onText(e.target.value)}
        onBlur={onDone}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onDone()
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancel()
          }
        }}
        className="h-[24px] w-[110px] rounded-[var(--radius-small)] border border-accent bg-panel px-[6px] text-ui outline-none"
      />
    </span>
  )
}

function TabButton({
  tab,
  active,
  over,
  onPick,
  onRename,
  onOver,
  onDropSource,
}: {
  tab: SourceTab
  active: boolean
  over: boolean
  onPick: () => void
  onRename: () => void
  onOver: (over: boolean) => void
  onDropSource: (sourceId: string) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={tab.own ? 'Doppelklick benennt um' : undefined}
      onClick={onPick}
      onDoubleClick={tab.own ? onRename : undefined}
      onDragOver={(e) => {
        if (!carriesSource(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onOver(true)
      }}
      onDragLeave={() => onOver(false)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(SOURCE_DRAG)
        onOver(false)
        if (id !== '') onDropSource(id)
      }}
      className={cn(
        '-mb-px whitespace-nowrap border-b-2 px-[8px] text-ui transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
        over && 'rounded-t-[var(--radius-small)] bg-accent-soft text-ink',
        active ? 'border-b-accent font-bold text-ink' : 'border-b-transparent font-semibold text-muted hover:text-ink',
      )}
    >
      {tab.name}
      {tab.count > 0 && <span className="ml-[5px] font-semibold tabular-nums text-muted">{tab.count}</span>}
    </button>
  )
}

export function SourceTabs({
  tabs,
  active,
  onPick,
  onDropSource,
  onCreate,
  onRename,
  onRemove,
}: {
  tabs: readonly SourceTab[]
  active: string
  onPick: (name: string) => void
  onDropSource: (sourceId: string, tab: string) => void
  onCreate: (name: string) => void
  onRename: (was: string, name: string) => void
  onRemove: (name: string) => void
}) {
  const [over, setOver] = useState<string | null>(null)
  const [naming, setNaming] = useState<Naming | null>(null)

  const finish = () => {
    if (naming === null) return
    const name = naming.text.trim()
    if (name !== '' && naming.was === null) onCreate(name)
    if (name !== '' && naming.was !== null && name !== naming.was) onRename(naming.was, name)
    setNaming(null)
  }
  const input = (label: string) => (
    <NameInput
      label={label}
      text={naming?.text ?? ''}
      onText={(text) => setNaming((n) => (n ? { ...n, text } : n))}
      onDone={finish}
      onCancel={() => setNaming(null)}
    />
  )

  return (
    <nav className="flex h-[36px] shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b border-line-soft px-[4px] [scrollbar-width:none]">
      {tabs.map((t) =>
        naming?.was === t.name ? (
          <span key={t.name}>{input(`Reiter „${t.name}“ umbenennen`)}</span>
        ) : (
          <span key={t.name} className="flex shrink-0 items-stretch">
            <TabButton
              tab={t}
              active={active === t.name}
              over={over === t.name}
              onPick={() => onPick(t.name)}
              onRename={() => setNaming({ was: t.name, text: t.name })}
              onOver={(on) => setOver((o) => (on ? t.name : o === t.name ? null : o))}
              onDropSource={(id) => onDropSource(id, t.name)}
            />
            {t.own && active === t.name && (
              <button
                type="button"
                aria-label={`Reiter „${t.name}“ entfernen, seine Quellen kommen zurück in ihre Reiter`}
                onClick={() => onRemove(t.name)}
                className="flex items-center px-[2px] text-muted hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </span>
        ),
      )}
      {naming?.was === null ? (
        input('Name des neuen Reiters')
      ) : (
        <button
          type="button"
          aria-label="Neuer Reiter"
          onClick={() => setNaming({ was: null, text: '' })}
          className="flex shrink-0 items-center px-[8px] text-muted hover:text-ink"
        >
          <Plus size={14} />
        </button>
      )}
    </nav>
  )
}
