import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { cssZoomOf } from '../../blocks/base/cssZoom'
import type { Frame, HeadPlace } from '../../blocks/base/headsReport'
import type { BlockNode } from '../../core/block/tree'
import { listDefaultTitle, withInner, type ListBinding } from '../../core/block/blockType'
import { useEditorInstance } from '../state/EditorContext'
import type { ListPick } from './ListEntryBar'
import { useHeadsPlaced } from './useHeadsPlaced'

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

const DRAG_THRESHOLD = 5

const HANDLE_EDGE = 6

const PLUS_SIZE = 20

const PLUS_GAP = 4

interface ColumnPlusProps {
  frame: RefObject<HTMLElement | null>

  x: number
  y: number
  down: boolean

  label: string
  onAdd: () => void
}

function ColumnPlus({ frame, x, y, down, label, onAdd }: ColumnPlusProps) {
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const measure = (): void => {
      const at = frame.current?.getBoundingClientRect()
      const zoom = frame.current ? cssZoomOf(frame.current) : 1
      const canvas = frame.current?.closest('[data-ff-canvas]')
      const sheet = canvas?.getBoundingClientRect()
      const edge = canvas && sheet ? sheet.left + canvas.clientWidth : document.documentElement.clientWidth
      const left = Math.min((at?.left ?? 0) + x * zoom + (down ? 0 : PLUS_GAP), edge - PLUS_SIZE - PLUS_GAP)
      const top = (at?.top ?? 0) + y * zoom + (down ? PLUS_GAP : -PLUS_SIZE / 2)
      const shown =
        at !== undefined &&
        sheet !== undefined &&
        left >= sheet.left &&
        top >= sheet.top &&
        top + PLUS_SIZE <= sheet.bottom
      setPlace((before) => {
        if (!shown) return null
        return before?.left === left && before.top === top ? before : { left, top }
      })
    }
    measure()
    window.addEventListener('scroll', measure, { capture: true, passive: true })
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, { capture: true })
      window.removeEventListener('resize', measure)
    }
  })

  if (place === null) return null
  return createPortal(
    <button
      type="button"
      data-ff-editor-helper
      aria-label={label}
      title={label}
      className="fixed z-30 grid place-items-center rounded border border-line bg-panel text-selection hover:bg-selection/[.08]"
      style={{ left: place.left, top: place.top, width: PLUS_SIZE, height: PLUS_SIZE }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onAdd()
      }}
    >
      <Plus size={13} />
    </button>,
    document.body,
  )
}

// Where the bar of a list entry opens: under its head, kept inside the window.
function listPickAt(s: HeadPlace, key: string | undefined, frame: HTMLElement): ListPick {
  const reference = frame.getBoundingClientRect()
  const zoom = cssZoomOf(frame)
  return {
    index: s.path.index,
    ...(s.path.inner === undefined ? {} : { inner: s.path.inner }),
    ...(key === undefined ? {} : { key }),
    below: s.below,
    top: Math.max(8, reference.top + (s.top + s.height) * zoom + 4),
    left: Math.max(8, reference.left + s.left * zoom),
  }
}

export function ColumnControls({
  block,
  selected,
  open,
  openSpot,
  binding,
  element,
  host,
  onSelect,
  onPick,
}: ColumnControlsProps) {
  const editor = useEditorInstance()

  const { heads: spots, places } = useHeadsPlaced(element)
  const [drag, setDrag] = useState<{ from: number; slot: number } | null>(null)
  const opening = useRef<number | null>(null)

  const entries = binding.entries(block.values[binding.prop])
  const keyAt = (index: number): string | undefined => {
    const entry = entries[index]
    return entry === undefined ? undefined : binding.keyOf?.(entry)
  }

  const openPicker = (index: number): void => {
    onSelect?.()
    const s = spots[index]
    if (!host.current || !s) return
    onPick(listPickAt(s, keyAt(s.path.index), host.current))
  }

  const anchor =
    openSpot === null
      ? undefined
      : spots.find(
          (s) =>
            s.path.index === openSpot.index && s.path.inner === openSpot.inner && s.below === (openSpot.below === true),
        )
  const anchorKey = anchor === undefined ? undefined : keyAt(anchor.path.index)
  useLayoutEffect(() => {
    if (anchor && host.current) onPick(listPickAt(anchor, anchorKey, host.current))
  }, [anchor, anchorKey, host, onPick])

  useLayoutEffect(() => {
    if (opening.current === null) return
    const index = spots.findIndex((s) => s.path.index === opening.current && s.path.inner === undefined && !s.below)
    if (index < 0) return
    opening.current = null
    openPicker(index)
  })

  const rename = (index: number): void => {
    const s = spots[index]
    if (!s) return
    s.rename((typed, original) => {
      if (typed === original) return
      const entries = binding.entries(block.values[binding.prop])
      const entry = entries[s.path.index]
      if (entry === undefined) return
      const at = s.path.inner
      if (at === undefined) {
        const next = [...entries]
        next[s.path.index] = binding.withTypedTitle(
          entry,
          typed === '' ? listDefaultTitle(binding, s.path.index) : typed,
        )
        editor.updateProperty(block.id, binding.prop, next)
        return
      }
      const inner = binding.inner
      const list = inner ? [...inner.of(entry)] : []
      const own = list[at]
      if (!inner || own === undefined) return
      list[at] = inner.binding.withTypedTitle(own, typed === '' ? listDefaultTitle(inner.binding, at) : typed)
      editor.updateProperty(block.id, binding.prop, withInner(binding, entries, s.path.index, list))
    })
  }

  const added = binding.entryAdd?.(entries) ?? null

  const waiting = open === null ? undefined : entries[open]
  const placing = waiting !== undefined && binding.entryPlace?.shown(waiting) === true ? binding.entryPlace : undefined

  const heads = spots.filter((s) => s.path.inner === undefined && !s.below)
  const down = binding.entriesDown === true
  const startOf = (s: Frame): number => (down ? s.top : s.left)
  const lengthOf = (s: Frame): number => (down ? s.height : s.width)

  const carriesBlock = (index: number): boolean => {
    const s = spots[index]
    return down && !(s !== undefined && s.path.inner === undefined && s.path.index === open)
  }

  const clickHead = (index: number, wasSelected: boolean): void => {
    if (wasSelected) openPicker(index)
    else onSelect?.()
  }

  const onPress = (index: number, e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    const frame = host.current
    if (!frame) return

    const wasSelected = editor.selectedId === block.id
    const stays = spots[index]?.path.inner !== undefined || spots[index]?.below === true
    const pointerAt = (ev: { clientX: number; clientY: number }): number => (down ? ev.clientY : ev.clientX)
    const startAt = pointerAt(e)
    const reference = frame.getBoundingClientRect()
    const referenceStart = down ? reference.top : reference.left
    const zoom = cssZoomOf(frame)
    const midway = heads.map((s) => referenceStart + (startOf(s) + lengthOf(s) / 2) * zoom)
    let drags = false
    let slot = index
    const slotOf = (at: number): number => {
      for (let i = 0; i < midway.length; i++) if (at < midway[i]) return i
      return midway.length
    }
    const cleanUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onCancel)
      window.removeEventListener('keydown', onKey, true)
      if (drags) document.body.style.cursor = ''
      setDrag(null)
    }
    function onMove(ev: PointerEvent): void {
      if (!drags) {
        if (stays || Math.abs(pointerAt(ev) - startAt) < DRAG_THRESHOLD) return
        drags = true
        document.body.style.cursor = 'grabbing'
      }
      ev.preventDefault()
      slot = slotOf(pointerAt(ev))
      setDrag({ from: index, slot })
    }
    function onEnd(): void {
      const what = drags
      const s = slot
      cleanUp()
      if (!what) {
        clickHead(index, wasSelected)
        return
      }
      if (binding.entryMove === undefined) return

      const of = spots[index]?.path.index ?? index
      const toRaw = heads[s]?.path.index ?? (heads[heads.length - 1]?.path.index ?? 0) + 1
      const next = binding.entryMove(entries, of, toRaw > of ? toRaw - 1 : toRaw)
      if (next !== null) editor.updateProperty(block.id, binding.prop, next)
    }
    function onCancel(): void {
      cleanUp()
    }
    function onKey(ev: KeyboardEvent): void {
      if (ev.key !== 'Escape') return
      ev.stopPropagation()
      cleanUp()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onCancel)
    window.addEventListener('keydown', onKey, true)
  }

  if (heads.length === 0) return null
  const first = heads[0]
  const last = heads[heads.length - 1]
  const line =
    drag === null ? null : drag.slot < heads.length ? startOf(heads[drag.slot]) : startOf(last) + lengthOf(last)
  const edge = Math.max(...heads.map((s) => s.left + s.width))
  const topLine = heads.reduce((a, s) => (s.top < a.top ? s : a), first)
  const foot = Math.max(...heads.map((s) => s.top + s.height))

  return (
    <div data-ff-editor-helper className="pointer-events-none absolute inset-0 z-10">
      {spots.map((s, i) => (
        <div
          key={i}
          className={cn(
            'pointer-events-auto absolute cursor-pointer hover:bg-selection/[.08]',
            drag?.from === i && 'bg-selection/[.08]',
          )}
          style={{
            left: s.left + HANDLE_EDGE,
            top: s.top,
            width: Math.max(0, s.width - 2 * HANDLE_EDGE),
            height: s.height,
          }}
          onPointerDown={(e) => {
            if (!carriesBlock(i)) onPress(i, e)
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (carriesBlock(i) && e.detail <= 1) clickHead(i, editor.selectedId === block.id)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            rename(i)
          }}
        />
      ))}
      {open !== null &&
        placing !== undefined &&
        places.map((p) => (
          <div
            key={p.key}
            className="pointer-events-auto absolute cursor-pointer hover:bg-selection/[.08]"
            style={{ left: p.left, top: p.top, width: p.width, height: p.height }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              const next = placing.placed(entries, open, p.key)
              if (next !== null) editor.updateProperty(block.id, binding.prop, next)
            }}
          />
        ))}
      {selected && added !== null && (
        <ColumnPlus
          frame={host}
          x={down ? first.left : edge}
          y={down ? foot : topLine.top + topLine.height / 2}
          down={down}
          label={`${binding.defaultTitle.replace(/\s*\{n\}/, '')} anfügen`}
          onAdd={() => {
            if (editor.updateProperty(block.id, binding.prop, added)) opening.current = added.length - 1
          }}
        />
      )}
      {line !== null && (
        <div
          className={cn('absolute rounded bg-selection', down ? 'h-[3px]' : 'w-[3px]')}
          style={
            down
              ? { top: line - 1, left: first.left, width: first.width }
              : { left: line - 1, top: first.top, height: first.height }
          }
        />
      )}
    </div>
  )
}
