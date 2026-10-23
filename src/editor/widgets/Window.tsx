import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/editor/icons/icon'
import { Button } from './Button'
import { cn } from './cn'
import { FamilyMember } from './Popover'
import { useCloseOnEscape } from './useCloseOnEscape'

interface WindowTab<K extends string> {
  key: K
  name: string
  count?: number
}

export function Window<K extends string>({
  title,
  beside,
  buttons,
  tabs,
  tab,
  onTab,
  width,
  height,
  tabsInHead = false,
  panel = false,
  level = 40,
  foot,
  onClose,
  children,
}: {
  title: string
  beside?: ReactNode
  buttons?: ReactNode
  tabs?: readonly WindowTab<K>[]
  tab?: K
  onTab?: (key: K) => void
  tabsInHead?: boolean
  width: number
  height?: number
  panel?: boolean
  level?: number
  foot?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  useCloseOnEscape(onClose)
  return (
    <FamilyMember>
      {(family) => createPortal(
        <section
          role={panel ? 'region' : 'dialog'}
          aria-label={title}
          data-ff-popover-family={family}
          {...(panel ? { 'data-ff-data-panel': '' } : { 'data-ff-editor-helper': '' })}
          style={{
            width: `min(${width}px, 96vw)`,
            ...(height === undefined ? { maxHeight: '92vh' } : { height: `min(${height}px, 92vh)` }),
            zIndex: level,
          }}
          className="fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-card)] bg-panel text-ui text-ink shadow-overlay"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <header className="flex h-[52px] shrink-0 items-stretch gap-[14px] border-b border-line-soft pr-[12px]">
            {tabsInHead && tabs
              ? <Tabs tabs={tabs} tab={tab} onTab={onTab} inHead />
              : <h2 className="flex shrink-0 items-center pl-[22px] text-title font-bold">{title}</h2>}
            <div className="flex min-w-0 flex-1 items-center">{beside}</div>
            <div className="flex shrink-0 items-center gap-[8px]">
              {buttons}
              <Button onlyIcon aria-label={`${title} schließen`} title="Schließen" onClick={onClose}>
                <X size={15} />
              </Button>
            </div>
          </header>
          {!tabsInHead && tabs && <Tabs tabs={tabs} tab={tab} onTab={onTab} />}
          <div className="flex min-h-0 flex-1">{children}</div>
          {foot && (
            <footer className="flex shrink-0 justify-end gap-[8px] border-t border-line-soft bg-panel px-[18px] py-[10px]">
              {foot}
            </footer>
          )}
        </section>,
        document.body,
      )}
    </FamilyMember>
  )
}

function Tabs<K extends string>({ tabs, tab, onTab, inHead = false }: {
  tabs: readonly WindowTab<K>[]
  tab?: K
  onTab?: (key: K) => void
  inHead?: boolean
}) {
  return (
    <nav className={cn('flex shrink-0', inHead ? 'px-[8px]' : 'border-b border-line-soft px-[6px]')}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={tab === t.key}
          onClick={() => onTab?.(t.key)}
          className={cn(
            '-mb-px border-b-2 px-[12px] transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
            inHead ? 'text-title' : 'pb-[8px] pt-[9px]',
            tab === t.key
              ? 'border-b-accent font-bold text-ink'
              : 'border-b-transparent font-semibold text-muted hover:text-ink',
          )}
        >
          {t.name}
          {t.count !== undefined && <span className="ml-[6px] text-ui font-semibold tabular-nums text-muted">{t.count}</span>}
        </button>
      ))}
    </nav>
  )
}
