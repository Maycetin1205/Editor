import type { ReactNode } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import type { BindableSpot, EventDef, LookupWindow } from '../../core/block/capability'
import type { DeclaredProperty } from '../../core/block/propertyPlace'
import type { BlockNode } from '../../core/block/tree'
import { canCompute, carriesOwnSource } from '../../core/block/treeQuery'
import { blockType, declaredValue } from '../../core/block/registry'
import { hasCapability } from '../../core/block/capability'
import { SOURCE_PROPERTY } from '../../core/block/sourceProperty'
import { extraSourcesProperty, type SourceInReach } from '../../core/data/extraSources'
import { ActionsSection } from '../actions/ActionsSection'
import { EntryActions } from '../actions/EntryActions'
import { entryEventsOf, entryStepCount } from '../actions/entryEvents'
import { followedName, followOf } from '../bar/followOffer'
import { FollowPick } from '../bar/FollowPick'
import { LookupWindowSection } from '../bar/LookupWindowSection'
import { SelectionFollowSection } from '../bar/SelectionFollowSection'
import { SourceList } from '../bar/SourceList'
import { spotBinding } from '../canvas/useBindingPicker'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { carriesSplit } from '../canvas/splitWords'
import { CalculationRow, SplitRow, SpotRows } from './SpotRows'

export interface Folds {
  folded: (name: string) => boolean
  toggle: (name: string) => void
}

function Section({ name, summary, folds, children }: {
  name: string
  summary: string
  folds: Folds
  children: ReactNode
}) {
  const folded = folds.folded(name)
  return (
    <section className="flex shrink-0 flex-col border-t border-line">
      <button
        type="button"
        aria-expanded={!folded}
        onClick={() => folds.toggle(name)}
        className="flex h-[40px] items-center gap-[8px] pl-[12px] pr-[16px] text-left transition-colors hover:bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      >
        <ChevronDown size={14} aria-hidden className={cn('shrink-0 text-muted transition-transform', folded && '-rotate-90')} />
        <span className="shrink-0 font-bold text-ink">{name}</span>
        {folded && <span className="min-w-0 flex-1 truncate text-right text-dense text-muted">{summary}</span>}
      </button>
      {!folded && (
        <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[4px] px-[16px] pb-[14px] [&>:not([data-switch])]:basis-full">
          {children}
        </div>
      )}
    </section>
  )
}

const count = (n: number, one: string, many: string): string => (n === 0 ? 'nichts' : n === 1 ? `1 ${one}` : `${n} ${many}`)

function changedOf(block: BlockNode, props: readonly DeclaredProperty[]): string {
  const changed = props.filter(({ key, property }) => block.values[key] !== property.default)
  return changed.length === 0 ? 'wie vorgegeben' : changed.map(({ property }) => property.label).join(' · ')
}

function boundOf(block: BlockNode, spots: readonly BindableSpot[], sources: readonly SourceInReach[]): string {
  const bound = spots.filter((spot) => spotBinding(block, spot, sources) !== '')
  return bound.length === 0 ? 'nichts gebunden' : bound.map((spot) => spot.name).join(' · ')
}

interface SectionsProps {
  block: BlockNode

  controls: (props: DeclaredProperty[]) => ReactNode[]

  sourceProps: DeclaredProperty[]
  shows: DeclaredProperty[]
  spots: readonly BindableSpot[]
  lookupProps: DeclaredProperty[]

  searchWindow: LookupWindow | undefined

  helpers: 'beside' | 'apart' | undefined

  follows: boolean
  waiting: boolean

  events: readonly EventDef[]

  folds: Folds
}

export function Sections({
  block, controls, sourceProps, shows, spots, lookupProps, searchWindow, helpers, follows, waiting, events, folds,
}: SectionsProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const ownSource = carriesOwnSource(block)
  const hasSource = ownSource || sourceProps.length > 0
  const hasSearch = searchWindow !== undefined || lookupProps.length > 0
  const follow = follows ? followOf(block) : undefined
  const extra = ownSource ? declaredValue(block, extraSourcesProperty) : []
  const sourceName = library.find((s) => s.id === declaredValue(block, SOURCE_PROPERTY))?.name ?? 'keine'
  const entries = entryEventsOf(block) !== undefined
  const steps = events.reduce((n, ev) => n + (block.chains?.[ev.key]?.length ?? 0), 0) + entryStepCount(block)
  const computes = canCompute(block) && !hasCapability(blockType(block.type), 'list')

  return (
    <>
      {hasSource && (
        <Section name="Quelle" summary={ownSource ? sourceName : changedOf(block, sourceProps)} folds={folds}>
          {ownSource && <SourceList block={block} part={helpers === 'beside' ? 'all' : 'own'} />}
          {controls(sourceProps)}
        </Section>
      )}
      {helpers === 'apart' && (
        <Section name="Hilfsquelle" summary={count(extra.length, 'Quelle', 'Quellen')} folds={folds}>
          <SourceList block={block} part="helpers" />
          {carriesSplit(block) && extra.length > 0 && <SplitRow block={block} />}
        </Section>
      )}
      {(shows.length > 0 || spots.length > 0 || computes) && (
        <Section
          name="Anzeige"
          summary={spots.length > 0 ? boundOf(block, spots, ed.sourcesFor(block.id)) : changedOf(block, shows)}
          folds={folds}
        >
          <SpotRows block={block} spots={spots} />
          {computes && <CalculationRow block={block} />}
          {controls(shows)}
        </Section>
      )}
      {hasSearch && (
        <Section name="Suchfenster" summary={changedOf(block, lookupProps)} folds={folds}>
          {controls(lookupProps)}
          {searchWindow && <LookupWindowSection block={block} window={searchWindow} />}
        </Section>
      )}
      {follows && (
        <Section name="Folgt der Auswahl" summary={follow ? followedName(follow, ed.tree, library) : 'nichts'} folds={folds}>
          {follow !== undefined && !waiting
            ? <SelectionFollowSection block={block} onPick={() => ed.pickFollowFor(block.id)} />
            : <FollowPick block={block} />}
        </Section>
      )}
      {(events.length > 0 || entries) && (
        <Section name="Aktionen" summary={count(steps, 'Schritt', 'Schritte')} folds={folds}>
          {events.length > 0 && <ActionsSection block={block} events={events} />}
          {entries && <EntryActions block={block} />}
        </Section>
      )}
    </>
  )
}
