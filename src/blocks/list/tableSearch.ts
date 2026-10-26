import { html, type TemplateResult } from 'lit'
import { icon } from '../parts/icons'
import { focusFirstRow } from './rowFocus'

interface SearchPlacement {
  showSearch: boolean
  searchText: string
}

interface SearchAct {
  setSearchText: (text: string) => void
}

// Arrow down leaves the search for the first row.
function searchKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'ArrowDown') return
  if (focusFirstRow(e.target)) e.preventDefault()
}

export function tableSearch(placement: SearchPlacement, act: SearchAct): TemplateResult | string {
  if (!placement.showSearch) return ''
  return html`<div class="search-row">
        <div class="search">
          <span class="search-icon">${icon('magnifier')}</span>
          <input
            type="search"
            aria-label="Tabelle durchsuchen"
            .value=${placement.searchText}
            @input=${(e: Event) => act.setSearchText((e.target as HTMLInputElement).value)}
            @keydown=${searchKeyDown}
          />
        </div>
      </div>`
}
