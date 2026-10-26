import { createElement, useMemo, type ReactNode } from 'react'
import { Component, Trash2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import type { BlockType } from '../../core/block/blockType'
import { blockName } from '../../core/block/blockName'
import { capability } from '../../core/block/capability'
import { propertyVisible, type PropertyPlace } from '../../core/block/property'
import { propertiesFor, type DeclaredProperty } from '../../core/block/propertyPlace'
import { carriesOwnSource, maySelectionFollows } from '../../core/block/treeQuery'
import { declaredValue } from '../../core/block/registry'
import { SOURCE_PROPERTY } from '../../core/block/sourceProperty'
import { BLOCK_ICONS } from '../blockIcons'
import { controlShown } from '../bar/controlShown'
import { followOffered } from '../bar/followOffer'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { BarControl } from './BarControl'
import { Sections, type Folds } from './Sections'

interface BlockPropertiesProps {
  block: BlockNode
  def: BlockType | undefined
  folds: Folds

  onRemove?: () => void
}

function withFonts(
  shown: ReactNode[],
  choices: DeclaredProperty[],
  fonts: DeclaredProperty[],
  fontControls: ReactNode[],
): ReactNode[] {
  if (fonts.length === 0) return shown
  const by = fonts.find((f) => f.property.preset)?.property.preset?.by
  const after = choices.findIndex((c) => c.key === by)
  const at = after < 0 ? shown.length : after + 1
  return [...shown.slice(0, at), ...fontControls, ...shown.slice(at)]
}

export function BlockProperties({ block, def, folds, onRemove }: BlockPropertiesProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const session = useMemo(
    () => ({
      onBeginEditing: () => ed.beginTransaction(),
      onEndEditing: () => ed.endTransaction(),
    }),
    [ed],
  )

  const sourceInReach = ed.dataSourceFor(block.id)
  const at = (where: PropertyPlace): DeclaredProperty[] =>
    (def ? propertiesFor(block, def, where) : []).filter(({ property }) =>
      controlShown(property, block, sourceInReach, library),
    )
  const controls = (props: DeclaredProperty[]) =>
    props.map(({ key, property }) => (
      <BarControl
        key={key}
        block={block}
        propertyKey={key}
        property={property}
        sourceInReach={sourceInReach}
        session={session}
      />
    ))

  const choices = at('bar')
  const fonts = at('font')
  const searchWindow = capability(def, 'lookupWindow')?.window
  const windowShown =
    searchWindow !== undefined &&
    searchWindow.entriesProp === undefined &&
    propertyVisible(searchWindow.when, block.values)
  const helpers = carriesOwnSource(block) ? capability(def, 'source')?.helpers : undefined
  const follows = maySelectionFollows(block) && followOffered(ed.tree, block, library)

  const kind = def?.name ?? block.type
  const what = blockName(block, library)

  return (
    <>
      <div className="flex h-[52px] shrink-0 items-center gap-[10px] pl-[16px] pr-[8px]">
        {createElement(BLOCK_ICONS[block.type] ?? Component, {
          size: 18,
          className: 'shrink-0 text-ink-2',
          'aria-hidden': true,
        })}
        <span className="shrink-0 text-title font-bold text-ink">{kind}</span>
        <span className="min-w-0 flex-1 truncate text-muted" title={what !== kind ? what : undefined}>
          {what !== kind && `„${what}“`}
        </span>
        {onRemove && (
          <Button onlyIcon kind="risk" title="Baustein löschen" aria-label="Baustein löschen" onClick={onRemove}>
            <Trash2 size={15} />
          </Button>
        )}
      </div>

      {(choices.length > 0 || fonts.length > 0) && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-[16px] gap-y-[2px] px-[16px] pb-[12px] [&>:not([data-switch])]:basis-full">
          {withFonts(controls(choices), choices, fonts, controls(fonts))}
        </div>
      )}

      <Sections
        block={block}
        controls={controls}
        sourceProps={at('source')}
        shows={at('display')}
        lookupProps={at('lookup')}
        searchWindow={windowShown ? searchWindow : undefined}
        helpers={helpers === 'apart' && declaredValue(block, SOURCE_PROPERTY) === '' ? undefined : helpers}
        follows={follows}
        waiting={ed.view.followPickFor === block.id}
        events={(capability(def, 'events')?.list ?? []).filter((ev) => !ev.entry)}
        folds={folds}
      />
    </>
  )
}
