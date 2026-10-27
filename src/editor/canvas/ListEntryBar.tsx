import { Calculator, ListPlus, Search } from '@/editor/icons/icon'
import type { ComponentProps } from 'react'
import {
  entryValues,
  fieldChoicesRead,
  flagOn,
  flagFor,
  innerOf,
  listDefaultTitle,
  type ListBinding,
} from '../../core/block/blockType'
import type { LookupWindow } from '../../core/block/capability'
import type { BlockNode } from '../../core/block/tree'
import { canCompute } from '../../core/block/treeQuery'
import { sourcesKey, type DataSource } from '../../core/data/dataSources'
import type { SourceInReach } from '../../core/data/extraSources'
import { boundField, sourceInReachOf } from '../../core/data/boundField'
import { ColumnBar } from '../bar/ColumnBar'
import type { EditorStore } from '../state/EditorStore'
import type { PickerGroup, SourcesChoice } from './FieldPicker'
import { widthFromLength } from './fieldWidth'
import { listEntryWrites, type ListEntryWrites } from './listEntryWrites'
import { openLookupInEditor } from './lookupWindowState'

export interface ListPick {
  index: number
  inner?: number

  key?: string

  below?: boolean
  top: number
  left: number
}

interface ListEntryBarProps {
  editor: EditorStore
  block: BlockNode
  listBinding: ListBinding
  pick: ListPick

  sources: readonly SourceInReach[]
  groups: PickerGroup[]

  sourceFromProp: DataSource | undefined
  hasFields: boolean
  sourcesChoice: SourcesChoice | undefined

  searchWindow: LookupWindow | undefined

  element: HTMLElement | null

  onClose: () => void
}

type BarProps = ComponentProps<typeof ColumnBar>

const withoutNumber = (title: string): string => title.replace(/\s*\{n\}/, '')

export function ListEntryBar(props: ListEntryBarProps) {
  const { editor, block, listBinding, pick, sources, groups, sourceFromProp, onClose } = props
  const w = listEntryWrites(editor, block, listBinding, pick.index)
  const entry = w.entriesOf()[pick.index]
  if (entry === undefined) return null
  const innerBinding = listBinding.inner?.binding
  const innerList = innerOf(listBinding, entry)

  const at = pick.inner
  if (at !== undefined) {
    const own = innerList[at]
    if (own === undefined || !innerBinding) return null
    return (
      <InnerEntryBar
        block={block}
        pick={pick}
        at={at}
        inner={innerBinding}
        own={own}
        groups={groups}
        w={w}
        onClose={onClose}
      />
    )
  }

  const perSource = sourceFromProp !== undefined
  const listGroups: PickerGroup[] = perSource
    ? [{ sourceId: '', name: sourceFromProp.name, badge: sourcesKey(sourceFromProp), fields: sourceFromProp.fields }]
    : groups
  const reach: readonly SourceInReach[] = perSource ? [{ source: sourceFromProp }] : sources
  const plainName = (fieldValue: string): string => boundField(fieldValue, reach)?.name || fieldValue
  const nameWithSource = (fieldValue: string): string => {
    const source = sourceInReachOf(fieldValue, reach)?.name ?? ''
    return source === '' ? plainName(fieldValue) : `${source}: ${plainName(fieldValue)}`
  }
  const titleNow = listBinding.titleOf(entry)
  const defaultTitle = listDefaultTitle(listBinding, pick.index)

  return (
    <ColumnBar
      key={pick.index}
      block={block}
      at={pick}
      name={titleNow === '' ? defaultTitle : titleNow}
      fields={entryFields(props, entry, w, reach)}
      groups={listGroups}
      sourcesChoice={perSource ? undefined : props.sourcesChoice}
      nameOf={nameWithSource}
      entries={entryGroups(listBinding, entry, innerList, w)}
      switches={flagFor(listBinding, entry).map((s) => ({
        key: s.key,
        label: s.short ?? s.name,
        on: flagOn(s, entry),
        onToggle: (on) => w.writeInEntry((e) => s.withValue(e, on)),
      }))}
      actions={entryActions(props, entry, w)}
      removeLabel={`${withoutNumber(listBinding.defaultTitle)} entfernen`}
      onRemove={
        listBinding.entryRemove === undefined
          ? undefined
          : () => {
              if (w.removeEntry()) onClose()
            }
      }
      onClose={onClose}
    />
  )
}

// The bar of an entry in the inner list of an entry, such as a place in a
// column of the board.
function InnerEntryBar({
  block,
  pick,
  at,
  inner,
  own,
  groups,
  w,
  onClose,
}: {
  block: BlockNode
  pick: ListPick
  at: number
  inner: ListBinding
  own: unknown
  groups: PickerGroup[]
  w: ListEntryWrites
  onClose: () => void
}) {
  const title = inner.titleOf(own)
  return (
    <ColumnBar
      key={`${pick.index}.${at}`}
      block={block}
      at={pick}
      name={title === '' ? listDefaultTitle(inner, at) : title}
      fields={[]}
      groups={groups}
      nameOf={(value) => value}
      entries={[w.innerGroup(at, inner, own)]}
      switches={[]}
      actions={[]}
      removeLabel={`${withoutNumber(inner.defaultTitle)} entfernen`}
      onRemove={
        inner.entryRemove === undefined
          ? undefined
          : () => {
              if (w.writeInner((list) => inner.entryRemove?.(list, at) ?? null)) onClose()
            }
      }
      onClose={onClose}
    />
  )
}

// The fields of the entry: the one it shows, and the fields of its choices.
// Picking a field names an untitled entry after it.
function entryFields(
  props: ListEntryBarProps,
  entry: unknown,
  w: ListEntryWrites,
  reach: readonly SourceInReach[],
): BarProps['fields'] {
  const { editor, block, listBinding, pick } = props
  if (!props.hasFields || listBinding.fieldless === true) return []
  const defaultTitle = listDefaultTitle(listBinding, pick.index)
  const titleFor = (value: string): string => (value === '' ? defaultTitle : boundField(value, reach)?.name || value)
  const pickField = (value: string): void => {
    editor.history.transaction(() => {
      const next = w.entriesOf()
      const target = next[pick.index]
      if (target === undefined) return
      next[pick.index] = listBinding.withPickedField(
        target,
        value,
        titleFor(value),
        widthFromLength(boundField(value, reach)?.length),
      )
      editor.updateProperty(block.id, listBinding.prop, next)
    })
  }
  return [
    { key: 'field', label: 'Feld', current: listBinding.fieldOf(entry), onChoose: pickField },
    ...fieldChoicesRead(listBinding, entry).map(({ choice, value }) => ({
      key: choice.key,
      label: choice.name,
      current: value,
      onlyForeignSources: choice.onlyForeignSources,
      onChoose: (next: string) => w.writeInEntry((e) => choice.withValue(e, next, titleFor(next))),
    })),
  ]
}

// The settings of the entry: those of its only inner entry, its own, and its choices.
function entryGroups(
  listBinding: ListBinding,
  entry: unknown,
  innerList: readonly unknown[],
  w: ListEntryWrites,
): NonNullable<BarProps['entries']> {
  const innerBinding = listBinding.inner?.binding
  return [
    ...(innerBinding && innerList.length === 1 ? [w.innerGroup(0, innerBinding, innerList[0])] : []),
    ...(listBinding.entryProperties === undefined
      ? []
      : [
          {
            properties: Object.entries(listBinding.entryProperties),
            access: { values: entryValues(listBinding, entry), set: w.setEntryValue },
          },
        ]),
    ...(listBinding.entryChoice ?? []).map((choice) => ({
      properties: [[choice.key, choice.property] as const],
      access: {
        values: { [choice.key]: choice.valueOf(entry) },
        set: (_key: string, value: unknown) => w.writeInEntry((e) => choice.withValue(e, String(value))),
      },
    })),
  ]
}

// What the bar opens from the entry: a new inner entry, the lookup window, a calculation.
function entryActions(props: ListEntryBarProps, entry: unknown, w: ListEntryWrites): BarProps['actions'] {
  const { editor, block, listBinding, pick, searchWindow, element, onClose } = props
  const innerBinding = listBinding.inner?.binding
  const innerAdd = innerBinding?.entryAdd
  const column = listBinding.keyOf?.(entry) ?? ''
  return [
    ...(!innerBinding || innerAdd === undefined
      ? []
      : [
          {
            label: `${withoutNumber(innerBinding.defaultTitle)} anfügen`,
            icon: ListPlus,
            onOpen: () => {
              w.writeInner((inner) => innerAdd(inner))
            },
          },
        ]),
    ...(searchWindow === undefined
      ? []
      : [
          {
            label: 'Nachschlagen',
            icon: Search,
            onOpen: () => {
              if (element) openLookupInEditor(editor, element, block.id, searchWindow, pick.index)
              onClose()
            },
          },
        ]),
    ...(!canCompute(block) || column === ''
      ? []
      : [
          {
            label: 'Berechnung',
            icon: Calculator,
            onOpen: () => {
              editor.view.openCalculation({ blockId: block.id, column })
              onClose()
            },
          },
        ]),
  ]
}
