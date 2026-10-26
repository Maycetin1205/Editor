import { html, type TemplateResult } from 'lit'
import { matchesSearch, searchWords } from '../../runtime/searchText'

export { plainText } from '../../runtime/searchText'

export function rowFits(row: readonly string[], searchText: string): boolean {
  return matchesSearch(row, searchText)
}

const SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g

export function markHit(text: string, searchText: string): TemplateResult | string {
  const words = searchWords(searchText)
  if (words.length === 0 || text === '') return text

  let template: RegExp
  try {
    template = new RegExp(`(${words.map((w) => w.replace(SPECIAL_CHARS, '\\$&')).join('|')})`, 'ig')
  } catch {
    return text
  }

  const parts = text.split(template)
  if (parts.length <= 1) return text
  return html`${parts.map((part, i) => (i % 2 === 1 ? html`<mark>${part}</mark>` : part))}`
}
