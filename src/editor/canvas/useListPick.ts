import { useLayoutEffect, useRef, type RefObject } from 'react'
import { cssZoomOf } from '../../blocks/base/cssZoom'
import type { HeadPlace } from '../../blocks/base/headsReport'
import type { ListBinding } from '../../core/block/blockType'
import type { ListPick } from './ListEntryBar'

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

interface ListPickArgs {
  binding: ListBinding
  entries: readonly unknown[]
  spots: readonly HeadPlace[]
  // The pick that is open now, if any.
  openSpot: ListPick | null
  host: RefObject<HTMLElement | null>
  onSelect?: () => void
  onPick: (pick: ListPick) => void
}

// Opens the bar of a list entry under its head, and keeps an open bar under
// its head while the heads move.
export function useListPick({ binding, entries, spots, openSpot, host, onSelect, onPick }: ListPickArgs): {
  openPicker: (spot: number) => void
  openAdded: (index: number) => void
} {
  const opening = useRef<number | null>(null)
  const keyAt = (index: number): string | undefined => {
    const entry = entries[index]
    return entry === undefined ? undefined : binding.keyOf?.(entry)
  }

  const openPicker = (spot: number): void => {
    onSelect?.()
    const s = spots[spot]
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

  // An added entry gets its head only after the element has drawn it.
  useLayoutEffect(() => {
    if (opening.current === null) return
    const spot = spots.findIndex((s) => s.path.index === opening.current && s.path.inner === undefined && !s.below)
    if (spot < 0) return
    opening.current = null
    openPicker(spot)
  })

  return {
    openPicker,
    openAdded: (index) => {
      opening.current = index
    },
  }
}
