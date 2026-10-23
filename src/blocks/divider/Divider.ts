import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { dividerStyle } from './dividerStyle'
import { dividerProperties, type DividerValues } from './properties'

export interface Divider extends DividerValues {}

export class Divider extends BlockElement {
  static readonly type = 'divider'
  static readonly tag = 'ff-divider'

  static override styles: CSSResultGroup = [BlockElement.styles, dividerStyle]

  protected override willUpdate(): void {
    this.style.setProperty('--divider-thickness', `${this.thickness}px`)
  }

  override render(): TemplateResult {
    const direction = this.direction === 'vertical' ? 'vertical' : 'horizontal'
    const word = this.word.trim()
    return html`<div class="divider ${direction}" role="separator" aria-orientation=${direction}><div
      class="line"></div>${word === ''
        ? nothing
        : html`<span class="word">${word}</span><div class="line"></div>`}</div>`
  }
}

defineBlock(Divider, {
  name: 'Trennlinie',
  category: 'layout',
  properties: dividerProperties,
  grid: { startWidth: 48, startHeight: 2, minWidth: 1, minHeight: 1 },
})
