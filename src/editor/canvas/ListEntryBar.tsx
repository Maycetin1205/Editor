import { Calculator, ListPlus, Search } from '@/editor/icons/icon'
import {
  entriesWithValue,
  entryValues,
  fieldChoicesRead,
  flagOn,
  flagFor,
  innerOf,
  listDefaultTitle,
  withInner,
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

export function ListEntryBar({
  editor,
  block,
  listBinding,
  pick,
  sources,
  groups,
  sourceFromProp,
  hasFields,
  sourcesChoice,
  searchWindow,
  element,
  onClose,
}: ListEntryBarProps) {
  const entriesOf = (): unknown[] => listBinding.entries(block.values[listBinding.prop])

  const list = entriesOf()
  const entry = list[pick.index]
  if (entry === undefined) return null
  const innerBinding = listBinding.inner?.binding
  const innerList = innerOf(listBinding, entry)

  const writeInEntry = (change: (entry: unknown) => unknown): void => {
    const next = entriesOf()
    const target = next[pick.index]
    if (target === undefined) return
    next[pick.index] = change(target)
    editor.updateProperty(block.id, listBinding.prop, next)
  }

  const writeInner = (change: (inner: readonly unknown[]) => readonly unknown[] | null): boolean => {
    const entries = entriesOf()
    const next = change(innerOf(listBinding, entries[pick.index]))
    if (next === null) return false
    return editor.updateProperty(block.id, listBinding.prop, withInner(listBinding, entries, pick.index, next))
  }

  const innerGroup = (at: number, inner: ListBinding, own: unknown) => ({
    properties: Object.entries(inner.entryProperties ?? {}),
    access: {
      values: entryValues(inner, own),
      set: (key: string, value: unknown) => {
        writeInner((list) => entriesWithValue(inner, list, at, key, value))
      },
    },
  })

  const perSource = sourceFromProp !== undefined
  const listGroups: PickerGroup[] = perSource
    ? [
        {
          sourceId: '',
          name: sourceFromProp.name,
          badge: sourcesKey(sourceFromProp),
          fields: sourceFromProp.fields,
        },
      ]
    : groups
  const titleNow = listBinding.titleOf(entry)
  const defaultTitle = listDefaultTitle(listBinding, pick.index)
  const reach: readonly SourceInReach[] = perSource ? [{ source: sourceFromProp }] : sources
  const plainName = (fieldValue: string): string => boundField(fieldValue, reach)?.name || fieldValue
  const sourceName = (fieldValue: string): string => sourceInReachOf(fieldValue, reach)?.name ?? ''
  const nameWithSource = (fieldValue: string): string => {
    const source = sourceName(fieldValue)
    return source === '' ? plainName(fieldValue) : `${source}: ${plainName(fieldValue)}`
  }

  const pickField = (value: string): void => {
    editor.transaction(() => {
      const next = entriesOf()
      const target = next[pick.index]
      if (target === undefined) return
      next[pick.index] = listBinding.withPickedField(
        target,
        value,
        value === '' ? defaultTitle : plainName(value),
        widthFromLength(boundField(value, reach)?.length),
      )
      editor.updateProperty(block.id, listBinding.prop, next)
    })
  }

  const at = pick.inner
  if (at !== undefined) {
    const own = innerList[at]
    if (own === undefined || !innerBinding) return null
    const title = innerBinding.titleOf(own)
    return (
      <ColumnBar
        key={`${pick.index}.${at}`}
        block={block}
        at={pick}
        name={title === '' ? listDefaultTitle(innerBinding, at) : title}
        fields={[]}
        groups={groups}
        nameOf={(value) => value}
        entries={[innerGroup(at, innerBinding, own)]}
        switches={[]}
        actions={[]}
        removeLabel={`${innerBinding.defaultTitle.replace(/\s*\{n\}/, '')} entfernen`}
        onRemove={
          innerBinding.entryRemove === undefined
            ? undefined
            : () => {
                if (writeInner((inner) => innerBinding.entryRemove?.(inner, at) ?? null)) onClose()
              }
        }
        onClose={onClose}
      />
    )
  }

  const innerAdd = innerBinding?.entryAdd
  const column = listBinding.keyOf?.(entry) ?? ''
  return (
    <ColumnBar
      key={pick.index}
      block={block}
      at={pick}
      name={titleNow === '' ? defaultTitle : titleNow}
      fields={
        !hasFields || listBinding.fieldless === true
          ? []
          : [
              { key: 'field', label: 'Feld', current: listBinding.fieldOf(entry), onChoose: pickField },
              ...fieldChoicesRead(listBinding, entry).map(({ choice, value }) => ({
                key: choice.key,
                label: choice.name,
                current: value,
                onlyForeignSources: choice.onlyForeignSources,
                onChoose: (next: string) =>
                  writeInEntry((e) => choice.withValue(e, next, next === '' ? defaultTitle : plainName(next))),
              })),
            ]
      }
      groups={listGroups}
      sourcesChoice={perSource ? undefined : sourcesChoice}
      nameOf={nameWithSource}
      entries={[
        ...(innerBinding && innerList.length === 1 ? [innerGroup(0, innerBinding, innerList[0])] : []),
        ...(listBinding.entryProperties === undefined
          ? []
          : [
              {
                properties: Object.entries(listBinding.entryProperties),
                access: {
                  values: entryValues(listBinding, entry),
                  set: (key: string, value: unknown) =>
                    editor.updateProperty(
                      block.id,
                      listBinding.prop,
                      entriesWithValue(listBinding, entriesOf(), pick.index, key, value),
                    ),
                },
              },
            ]),
        ...(listBinding.entryChoice ?? []).map((choice) => ({
          properties: [[choice.key, choice.property] as const],
          access: {
            values: { [choice.key]: choice.valueOf(entry) },
            set: (_key: string, value: unknown) => writeInEntry((e) => choice.withValue(e, String(value))),
          },
        })),
      ]}
      switches={flagFor(listBinding, entry).map((s) => ({
        key: s.key,
        label: s.short ?? s.name,
        on: flagOn(s, entry),
        onToggle: (on) => writeInEntry((e) => s.withValue(e, on)),
      }))}
      actions={[
        ...(!innerBinding || innerAdd === undefined
          ? []
          : [
              {
                label: `${innerBinding.defaultTitle.replace(/\s*\{n\}/, '')} anfügen`,
                icon: ListPlus,
                onOpen: () => {
                  writeInner((inner) => innerAdd(inner))
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
                  editor.openCalculation({ blockId: block.id, column })
                  onClose()
                },
              },
            ]),
      ]}
      removeLabel={`${listBinding.defaultTitle.replace(/\s*\{n\}/, '')} entfernen`}
      onRemove={
        listBinding.entryRemove === undefined
          ? undefined
          : () => {
              const next = listBinding.entryRemove?.(entriesOf(), pick.index) ?? null
              if (next === null) return
              editor.updateProperty(block.id, listBinding.prop, next)
              onClose()
            }
      }
      onClose={onClose}
    />
  )
}
