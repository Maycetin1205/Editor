import { maskState } from './maskState'

// What a search field of the mask holds: the boards of the mask show only
// the cards that carry it. One search for the whole mask, as one chosen day.

const plain = (text: string): string => text.trim().toLowerCase()

function searchText(): string {
  return maskState.search.text
}

export function setSearchText(value: string): void {
  const next = plain(value)
  const search = maskState.search
  if (next === search.text) return
  search.text = next
  search.listeners.forEach((cb) => cb())
}

export function onSearchText(cb: () => void): () => void {
  const listeners = maskState.search.listeners
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

// Whether one of the texts holds every word searched for, in any order.
export function matchesSearch(texts: readonly string[], search: string = searchText()): boolean {
  if (search === '') return true
  const words = search.split(/\s+/).filter((w) => w !== '')
  const all = texts.map(plain).join(' ')
  return words.every((word) => all.includes(word))
}
