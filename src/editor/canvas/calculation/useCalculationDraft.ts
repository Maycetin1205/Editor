import { useState } from 'react'
import type { Calculation, Term } from '../../../core/data/calculation'
import { asNumber } from '../../../core/data/number'
import { termOrigin } from './calculationWords'

const EMPTY_TERM: Term = { kind: 'fixed', value: '', divides: false }

// The calculation while its window is open: the terms, the selected line,
// the list open at a line, and an origin chosen for a line whose entry is
// still to be picked.
export function useCalculationDraft(calculation: Calculation) {
  const [draft, setDraft] = useState(calculation)
  const [selected, setSelected] = useState<number | null>(null)
  const [pending, setPending] = useState<{ at: number; origin: string } | null>(null)
  const [open, setOpen] = useState<{ at: number; list: 'origin' | 'entry' } | null>(null)

  const terms = draft.terms
  const setTerms = (next: Term[]): void => setDraft({ ...draft, terms: next })
  const setTerm = (i: number, term: Term): void => setTerms(terms.map((t, k) => (k === i ? term : t)))

  const chooseOrigin = (i: number, key: string): void => {
    setOpen(null)
    const divides = terms[i]?.divides ?? false
    if (key === 'fixed') {
      setPending(null)
      if (terms[i]?.kind !== 'fixed') setTerm(i, { kind: 'fixed', value: '', divides })
      return
    }
    if (key === 'units') {
      setPending(null)
      if (terms[i]?.kind !== 'units') setTerm(i, { kind: 'units', table: [], divides })
      return
    }
    setPending({ at: i, origin: key })
    setOpen({ at: i, list: 'entry' })
  }
  const takeEntry = (i: number, value: string): void => {
    setPending(null)
    setOpen(null)
    const origin = termOrigin(value)
    if (origin) setTerm(i, { ...origin, divides: terms[i]?.divides ?? false })
  }
  const select = (i: number): void => {
    if (selected !== i) setPending(null)
    setSelected(i)
  }
  const remove = (i: number): void => {
    setTerms(terms.filter((_, k) => k !== i))
    setSelected(null)
    setPending(null)
  }
  const add = (): void => {
    setTerms([...terms, EMPTY_TERM])
    setSelected(terms.length)
    setOpen({ at: terms.length, list: 'origin' })
  }

  const unitsAt =
    selected !== null && terms[selected]?.kind === 'units' ? selected : terms.findIndex((t) => t.kind === 'units')
  const complete = terms.filter((t) => !(t.kind === 'fixed' && t.value.trim() === ''))
  const ready = complete.length > 0 && complete.every((t) => t.kind !== 'fixed' || asNumber(t.value) !== null)
  const finished: Calculation = { ...draft, terms: complete }

  return {
    draft,
    setDraft,
    terms,
    selected,
    unselect: () => setSelected(null),
    pending,
    open,
    setOpen,
    setTerm,
    chooseOrigin,
    takeEntry,
    select,
    remove,
    add,
    unitsAt,
    complete,
    ready,
    finished,
  }
}

export type CalculationDraft = ReturnType<typeof useCalculationDraft>
