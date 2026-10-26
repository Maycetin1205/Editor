const state = { text: '', listeners: new Set<() => void>() }

// What a search field of the mask holds: the boards of the mask show only
// the cards that carry it. One search for the whole mask, as one chosen day.

// Text as a search compares it: no case, no accents, ß as ss. "muller"
// finds "Müller" in every list of the mask alike.
export function plainText(text: string): string {
  return text.trim().toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '')
}

export function searchWords(search: string): string[] {
  return plainText(search)
    .split(/\s+/)
    .filter((w) => w !== '')
}

function searchText(): string {
  return state.text
}

export function setSearchText(value: string): void {
  const next = plainText(value)
  const search = state
  if (next === search.text) return
  search.text = next
  search.listeners.forEach((cb) => cb())
}

export function onSearchText(cb: () => void): () => void {
  const listeners = state.listeners
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

// Whether the texts together hold every word searched for, in any order.
export function matchesSearch(texts: readonly string[], search: string = searchText()): boolean {
  const words = searchWords(search)
  if (words.length === 0) return true
  const all = plainText(texts.join(' '))
  return words.every((word) => all.includes(word))
}
