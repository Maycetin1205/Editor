import { html, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { tabProperties, type TabValues } from './properties'
import { tabStyle } from './tabsStyle'

// The Reiter draws the titles of its pages; a page tells it when its own
// changes.
export const PAGE_CHANGED = 'ff-page-changed'

export interface Tab extends TabValues {}

export class Tab extends BlockElement {
  static readonly type = 'tab'
  static readonly tag = 'ff-tab'

  static override styles: CSSResultGroup = [BlockElement.styles, tabStyle]

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('name')) this.dispatchEvent(new Event(PAGE_CHANGED, { bubbles: true }))
  }

  override render(): TemplateResult {
    return html`<div class="body"><slot></slot></div>`
  }
}

defineBlock(Tab, {
  name: 'Reiterseite',
  category: 'layout',
  properties: tabProperties,
  takesChildren: true,
  gridArea: true,
  fillsParent: true,
  inPalette: false,
  allowedParent: ['tabs'],
})
