import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { cn } from '../widgets/cn'
import type { CellPlace, Frame, HeadPlace } from '../../blocks/base/headsReport'
import type { BlockNode } from '../../core/block/tree'
import type { ListBinding } from '../../core/block/blockType'
import { useEditorInstance } from '../state/useEditor'
import { ColumnPlus } from './ColumnPlus'
import { renameHead } from './headRename'
import type { ListPick } from './ListEntryBar'
import { useHeadDrag, lengthOf, startOf, type HeadDragShown } from './useHeadDrag'
import { useHeadsPlaced } from './useHeadsPlaced'
import { useListPick } from './useListPick'

interface ColumnControlsProps {
  block: BlockNode
  selected: boolean

  open: number | null

  openSpot: ListPick | null

  binding: ListBinding

  element: HTMLElement | null

  host: RefObject<HTMLElement | null>
  onSelect?: () => void
  // Opens the bar of a list entry at the given place.
  onPick: (pick: ListPick) => void
}

const HANDLE_EDGE = 6

interface HeadHandleProps {
  frame: Frame
  lit: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  onClick: (detail: number) => void
  onRename: () => void
}

function HeadHandle({ frame, lit, onPointerDown, onClick, onRename }: HeadHandleProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto absolute cursor-pointer hover:bg-selection/[.08]',
        lit && 'bg-selection/[.08]',
      )}
      style={{
        left: frame.left + HANDLE_EDGE,
        top: frame.top,
        width: Math.max(0, frame.width - 2 * HANDLE_EDGE),
        height: frame.height,
      }}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation()
        onClick(e.detail)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onRename()
      }}
    />
  )
}

// The cells an open entry can be placed into.
function EntryPlaces({ places, onPlace }: { places: readonly CellPlace[]; onPlace: (key: string) => void }) {
  return places.map((p) => (
    <div
      key={p.key}
      className="pointer-events-auto absolute cursor-pointer hover:bg-selection/[.08]"
      style={{ left: p.left, top: p.top, width: p.width, height: p.height }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onPlace(p.key)
      }}
    />
  ))
}

// The gap a dragged head would drop into.
function DropLine({ heads, shown, down }: { heads: readonly HeadPlace[]; shown: HeadDragShown; down: boolean }) {
  const first = heads[0]
  const last = heads[heads.length - 1]
  const line = shown.slot < heads.length ? startOf(heads[shown.slot], down) : startOf(last, down) + lengthOf(last, down)
  return (
    <div
      className={cn('absolute rounded bg-selection', down ? 'h-[3px]' : 'w-[3px]')}
      style={
        down
          ? { top: line - 1, left: first.left, width: first.width }
          : { left: line - 1, top: first.top, height: first.height }
      }
    />
  )
}

export function ColumnControls(props: ColumnControlsProps) {
  const { block, selected, open, binding, element, host, onSelect } = props
  const editor = useEditorInstance()
  const { heads: spots, places } = useHeadsPlaced(element)
  const entries = binding.entries(block.values[binding.prop])
  const { openPicker, openAdded } = useListPick({ ...props, entries, spots })

  const heads = spots.filter((s) => s.path.inner === undefined && !s.below)
  const down = binding.entriesDown === true
  const clickHead = (index: number, wasSelected: boolean): void => {
    if (wasSelected) openPicker(index)
    else onSelect?.()
  }
  const { shown, press } = useHeadDrag({ editor, block, binding, entries, spots, heads, host, clickHead })

  // A head of an entry laid out downwards carries its block: the block takes
  // the press, the head only the click.
  const carriesBlock = (index: number): boolean => {
    const s = spots[index]
    return down && !(s !== undefined && s.path.inner === undefined && s.path.index === open)
  }

  const added = binding.entryAdd?.(entries) ?? null
  const waiting = open === null ? undefined : entries[open]
  const placing = waiting !== undefined && binding.entryPlace?.shown(waiting) === true ? binding.entryPlace : undefined

  if (heads.length === 0) return null
  const first = heads[0]
  const edge = Math.max(...heads.map((s) => s.left + s.width))
  const topLine = heads.reduce((a, s) => (s.top < a.top ? s : a), first)
  const foot = Math.max(...heads.map((s) => s.top + s.height))

  return (
    <div data-ff-editor-helper className="pointer-events-none absolute inset-0 z-10">
      {spots.map((s, i) => (
        <HeadHandle
          key={i}
          frame={s}
          lit={shown?.from === i}
          onPointerDown={(e) => {
            if (!carriesBlock(i)) press(i, e)
          }}
          onClick={(detail) => {
            if (carriesBlock(i) && detail <= 1) clickHead(i, editor.selectedId === block.id)
          }}
          onRename={() => renameHead(editor, block, binding, s)}
        />
      ))}
      {open !== null && placing !== undefined && (
        <EntryPlaces
          places={places}
          onPlace={(key) => {
            const next = placing.placed(entries, open, key)
            if (next !== null) editor.updateProperty(block.id, binding.prop, next)
          }}
        />
      )}
      {selected && added !== null && (
        <ColumnPlus
          frame={host}
          x={down ? first.left : edge}
          y={down ? foot : topLine.top + topLine.height / 2}
          down={down}
          label={`${binding.defaultTitle.replace(/\s*\{n\}/, '')} anfügen`}
          onAdd={() => {
            if (editor.updateProperty(block.id, binding.prop, added)) openAdded(added.length - 1)
          }}
        />
      )}
      {shown !== null && <DropLine heads={heads} shown={shown} down={down} />}
    </div>
  )
}
