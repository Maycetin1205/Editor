import { describe, expect, it } from 'vitest'
import { ViewChoices } from '../src/blocks/list/viewChoices'
import { BLOCK_ID_ATTR } from '../src/core/data/actions'

function tableElement(id: string) {
  const el = Object.assign(document.createElement('div'), {
    preview: false,
    editable: false,
    sortByClick: true,
    renderRoot: document.createElement('div'),
    requestUpdate: () => {},
  })
  el.setAttribute(BLOCK_ID_ATTR, id)
  return el
}

const columns = () => [{ key: 'a' }, { key: 'b' }]

describe('ViewChoices.reset', () => {
  it('keeps the remembered sorting when the rows change', () => {
    const el = tableElement('sorted')
    const view = new ViewChoices(el, columns)
    view.clickSort(1)
    view.clickSort(1)
    view.setSearchText('x')
    view.reset()
    expect(view.searchText).toBe('')
    expect(view.sortColumn).toBe(1)
    expect(view.sortAscending).toBe(false)
    expect(new ViewChoices(el, columns).sortColumn).toBe(1)
  })
})
