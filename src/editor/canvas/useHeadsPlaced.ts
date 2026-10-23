import { useCallback, useSyncExternalStore } from 'react'
import { HEADS_PLACED, NO_HEADS, headsPlacedOf, type HeadsPlaced } from '../../blocks/base/headsReport'

export function useHeadsPlaced(element: HTMLElement | null): HeadsPlaced {
  const subscribe = useCallback(
    (changed: () => void) => {
      element?.addEventListener(HEADS_PLACED, changed)
      return () => element?.removeEventListener(HEADS_PLACED, changed)
    },
    [element],
  )
  return useSyncExternalStore(subscribe, () => (element === null ? NO_HEADS : headsPlacedOf(element)))
}
