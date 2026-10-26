import { useCallback, useState, type ReactNode, type RefObject } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { type ListBinding } from '../../core/block/blockType'
import type { SpotClick } from '../../blocks/base/BlockElement'
import type { BindableSpot, LookupWindow } from '../../core/block/capability'
import type { SourceInReach } from '../../core/data/extraSources'
import type { EditorStore } from '../state/EditorStore'
import { sourcesCarrier } from '../../core/block/sourcesInReach'
import { useDataSources } from '../state/useDataSources'
import { librarySourcesChoice, pickerGroups } from './pickerGroups'
import { ListEntryBar, type ListPick } from './ListEntryBar'
import { SpotFieldPicker } from './SpotFieldPicker'
import { useBindingPicker } from './useBindingPicker'

interface FieldBindingArgs {
  editor: EditorStore
  blockRef: RefObject<BlockNode>
  block: BlockNode
  selected: boolean | undefined
  bindableSpots: readonly BindableSpot[]
  listBinding: ListBinding | undefined

  searchWindow: LookupWindow | undefined

  sources: readonly SourceInReach[]

  element: HTMLElement | null

  spotClickOf: (click: Event) => SpotClick | null

  onSelect?: () => void
}

export function useFieldBinding({
  editor,
  blockRef,
  block,
  selected,
  bindableSpots,
  listBinding,
  searchWindow,
  sources,
  element,
  spotClickOf,
  onSelect,
}: FieldBindingArgs): {
  onClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  onDoubleClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  pickers: ReactNode

  openEntry: number | null

  openSpot: ListPick | null

  pickList: (pick: ListPick) => void
} {
  const library = useDataSources().list

  const hasSource = sources.length > 0

  const libraryOffer = !hasSource && sourcesCarrier(editor.tree, block.id) !== undefined
  const hasOffer = hasSource || libraryOffer

  const { picker, closePicker, onClick, onDoubleClick } = useBindingPicker({
    editor,
    blockRef,
    selected,
    bindableSpots,
    hasOffer,
    spotClickOf,
    onSelect,
  })

  const [listPicker, setListPicker] = useState<ListPick | null>(null)
  const closeListPicker = useCallback(() => setListPicker(null), [])
  if (!selected && listPicker !== null) setListPicker(null)

  const sourceFromProp =
    listBinding?.sourceProp === undefined
      ? undefined
      : library.find((s) => s.id === String(block.values[listBinding.sourceProp ?? ''] ?? ''))
  const listPickerHasFields = listBinding?.sourceProp !== undefined ? sourceFromProp !== undefined : hasOffer

  // ColumnControls opens the bar of a list entry; the same place keeps the
  // same pick, so the bar does not render again.
  const pickList = useCallback((next: ListPick) => {
    setListPicker((before) => (before !== null && samePick(before, next) ? before : next))
  }, [])

  const entriesNow = listBinding ? listBinding.entries(block.values[listBinding.prop]) : []
  const pickAt =
    listPicker === null
      ? -1
      : listPicker.key === undefined
        ? listPicker.index
        : entriesNow.findIndex((e) => listBinding?.keyOf?.(e) === listPicker.key)
  if (listPicker !== null && entriesNow[pickAt] === undefined) setListPicker(null)
  const pick = listPicker === null || pickAt === -1 ? null : { ...listPicker, index: pickAt }

  const ownWindow = searchWindow?.entriesProp !== undefined && searchWindow.entriesProp === listBinding?.prop

  const groups = pickerGroups(sources)

  const sourcesChoice = librarySourcesChoice(editor, block.id, sources, library, () => {
    closePicker()
    closeListPicker()
  })

  const pickers = (
    <>
      {selected && picker && hasOffer && (
        <SpotFieldPicker
          editor={editor}
          block={block}
          spot={picker.spot}
          sources={sources}
          sourcesChoice={sourcesChoice}
          top={picker.top}
          left={picker.left}
          onClose={closePicker}
        />
      )}
      {selected && pick && listBinding && (
        <ListEntryBar
          editor={editor}
          block={block}
          listBinding={listBinding}
          pick={pick}
          sources={sources}
          groups={groups}
          sourceFromProp={sourceFromProp}
          hasFields={listPickerHasFields}
          sourcesChoice={sourcesChoice}
          searchWindow={ownWindow ? searchWindow : undefined}
          element={element}
          onClose={closeListPicker}
        />
      )}
    </>
  )

  const columnOpen = selected === true && pick !== null

  const openEntry = columnOpen && pick.inner === undefined ? pick.index : null

  return { onClick, onDoubleClick, pickers, openEntry, openSpot: columnOpen ? pick : null, pickList }
}

const samePick = (a: ListPick, b: ListPick): boolean =>
  a.index === b.index &&
  a.inner === b.inner &&
  a.key === b.key &&
  a.below === b.below &&
  a.top === b.top &&
  a.left === b.left
