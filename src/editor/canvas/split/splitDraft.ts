import { useState } from 'react'
import { SPLIT_HIDE_MAX, SPLIT_SORT_MAX, type Split, type SplitHide, type SplitSort } from '../../../core/data/split'

// The list with the entry at `at` swapped one step up or down.
export function moved<T>(list: readonly T[], at: number, step: -1 | 1): T[] {
  const to = at + step
  if (to < 0 || to >= list.length) return [...list]
  const next = [...list]
  ;[next[at], next[to]] = [next[to], next[at]]
  return next
}

// A typed whole number from 0 to `max`, or nothing for anything else.
export function wholeOrNone(text: string, max: number): number | undefined {
  const n = Number.parseInt(text, 10)
  return Number.isInteger(n) && n >= 0 && n <= max ? n : undefined
}

export interface SplitDraft {
  draft: Split
  // Starts over on another source, which has other fields.
  restart: (split: Split) => void
  set: (part: Partial<Split>) => void
  setSort: (at: number, sort: SplitSort | null) => void
  setHide: (at: number, hide: SplitHide | null) => void
}

// The split as the window edits it; nothing is written before Übernehmen.
export function useSplitDraft(split: Split): SplitDraft {
  const [draft, setDraft] = useState(split)
  const set = (part: Partial<Split>): void => setDraft({ ...draft, ...part })
  return {
    draft,
    restart: setDraft,
    set,
    setSort: (at, sort) => {
      const next = [...draft.sort]
      if (sort === null) next.splice(at, 1)
      else next[at] = sort
      set({ sort: next.filter((s) => s.field !== '').slice(0, SPLIT_SORT_MAX) })
    },
    setHide: (at, hide) => {
      const next = [...draft.hide]
      if (hide === null) next.splice(at, 1)
      else next[at] = hide
      set({ hide: next.slice(0, SPLIT_HIDE_MAX) })
    },
  }
}
