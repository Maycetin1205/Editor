import { useCallback, useRef, useSyncExternalStore } from 'react'

interface Store {
  subscribe(listener: () => void): () => void
}

// A part of a store: the component draws again only when that part changes.
// same decides it (by default Object.is); while it holds, the part read
// before stays, so a selector may build a fresh array or object.
export function useStoreSelect<S extends Store, T>(
  store: S,
  select: (store: S) => T,
  same: (a: T, b: T) => boolean = Object.is,
): T {
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store])
  const kept = useRef<{ value: T } | null>(null)
  const snapshot = (): T => {
    const next = select(store)
    const before = kept.current
    if (before !== null && same(before.value, next)) return before.value
    kept.current = { value: next }
    return next
  }
  return useSyncExternalStore(subscribe, snapshot)
}

export function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, i) => Object.is(item, b[i]))
}

export function sameFields<T extends object>(a: T, b: T): boolean {
  const keys = Object.keys(a) as (keyof T)[]
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]))
}
