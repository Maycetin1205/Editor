import { useState } from 'react'
import type { Parameter } from '../../core/data/actions'
import type { RelationTemplate } from '../../core/data/relations'
import type { Reach } from '../origin/reach'
import { adoptedField, fieldAdopt } from './fieldAdopt'
import { placeEmpty, placeEntries, placePicked } from './placeOrigins'

export interface Filled {
  parameter: readonly Parameter[]
  extraParameter: readonly Parameter[]
}

// Which list of a line is open: where the value comes from, or which value.
export type PlaceList = 'origin' | 'entry'

const EMPTY: Parameter = { source: 'fixed', value: '' }

interface PlacesArgs {
  template: RelationTemplate
  filled: Filled
  reach: Reach
  fold: boolean
  onChange: (filled: Filled) => void
}

// The parameter list as one list of places: the fixed ones first, then the
// extra ones. Holds which line is chosen, which list is open, and an origin
// picked before its value.
export function usePlaces({ template, filled, reach, fold, onChange }: PlacesArgs) {
  const all = [...filled.parameter, ...filled.extraParameter]
  const used = all.filter((b) => !placeEmpty(b)).length
  const [selected, setSelected] = useState<number | null>(null)
  const [pending, setPending] = useState<{ at: number; origin: string } | null>(null)
  const [open, setOpen] = useState<{ at: number; list: PlaceList } | null>(null)
  const [shut, setShut] = useState(used > 0)
  const fixedCount = filled.parameter.length
  const sources = reach.sources ?? []
  const adopted = adoptedField(template, filled.parameter, sources)
  // Empty places fold away once some are filled; the chosen one stays.
  const folding = fold && used > 0 && used < all.length
  const shown = all.map((b, i) => !(folding && shut) || !placeEmpty(b) || selected === i || pending?.at === i)

  const set = (i: number, b: Parameter) =>
    onChange(
      i < fixedCount
        ? { ...filled, parameter: filled.parameter.map((x, k) => (k === i ? b : x)) }
        : { ...filled, extraParameter: filled.extraParameter.map((x, k) => (k === i - fixedCount ? b : x)) },
    )
  const take = (i: number, value: string) => {
    setPending(null)
    setOpen(null)
    const picked = placePicked(value)
    if (picked === null) return
    if ('set' in picked) {
      set(i, picked.set)
      return
    }
    const source = sources.find((s) => s.id === picked.adopt.sourceId)
    if (source) onChange({ ...filled, parameter: fieldAdopt(filled.parameter, template, source, picked.adopt.code) })
  }
  // An origin with a single value takes it at once; otherwise its list opens.
  const chooseOrigin = (i: number, origin: string) => {
    setOpen(null)
    if (origin === 'fixed') {
      setPending(null)
      if (all[i]?.source !== 'fixed') set(i, EMPTY)
      return
    }
    const entries = placeEntries(origin, reach).flatMap((g) => g.entries)
    if (entries.length === 1 && entries[0]) {
      take(i, entries[0].value)
      return
    }
    set(i, EMPTY)
    setPending({ at: i, origin })
    setOpen({ at: i, list: 'entry' })
  }
  // To the next shown line up or down.
  const move = (from: number, by: number) => {
    let to = from + by
    while (to >= 0 && to < all.length && shown[to] !== true) to += by
    if (to >= 0 && to < all.length) setSelected(to)
  }
  const select = (i: number) => {
    if (selected !== i) setPending(null)
    setSelected(i)
  }
  const done = () => {
    setPending(null)
    setSelected(null)
  }
  const remove = (i: number) => {
    onChange({ ...filled, extraParameter: filled.extraParameter.filter((_, k) => k !== i - fixedCount) })
    setSelected(null)
  }
  const addExtra = () => {
    onChange({ ...filled, extraParameter: [...filled.extraParameter, EMPTY] })
    setSelected(all.length)
  }

  const state = { all, shown, selected, pending, open, setOpen, shut, setShut, folding, fixedCount, adopted }
  return { ...state, set, take, chooseOrigin, move, select, done, remove, addExtra }
}
