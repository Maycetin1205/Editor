import { ChevronDown } from '../icons/icon'
import { cn } from './cn'

export interface FoldTab<K extends string> {
  key: K
  name: string
}

export function FoldedColumn<K extends string>({
  side,
  tabs,
  onOpen,
}: {
  side: 'left' | 'right'
  tabs: readonly FoldTab<K>[]
  onOpen: (key: K) => void
}) {
  return (
    <aside
      className={cn(
        'flex w-[36px] shrink-0 flex-col items-center gap-[4px] border-line bg-ground py-[8px]',
        side === 'left' ? 'border-r' : 'border-l',
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          title={`${t.name} aufklappen`}
          onClick={() => onOpen(t.key)}
          className={cn(
            'rounded px-[7px] py-[12px] text-rubric font-bold text-muted transition-colors [writing-mode:vertical-rl]',
            'hover:bg-hover hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
            side === 'left' && 'rotate-180',
          )}
        >
          {t.name}
        </button>
      ))}
    </aside>
  )
}

export function FoldButton({ side, onFold }: { side: 'left' | 'right'; onFold: () => void }) {
  return (
    <button
      type="button"
      aria-label="Spalte einklappen"
      title="Spalte einklappen"
      onClick={onFold}
      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded text-muted transition-colors hover:bg-hover hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
    >
      <ChevronDown size={14} aria-hidden className={side === 'left' ? 'rotate-90' : '-rotate-90'} />
    </button>
  )
}
