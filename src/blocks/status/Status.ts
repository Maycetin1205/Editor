import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { reportsHeads } from '../base/headsReport'
import { reportsHeight } from '../base/heightReport'
import { readBoundSpot } from '../../runtime/boundSpot'
import { makeDataLink } from '../../runtime/source'
import { lookStyle, toneValue } from '../look/look'
import { STATES_BINDING, statusProperties, type StatusState, type StatusValues } from './properties'
import { statusStyle } from './statusStyle'

export interface Status extends StatusValues {}

// The value of a field as a state: the word and tone of the state that names
// the value. In the editor the block shows all its states, to be named,
// coloured and given their values on the canvas.
export class Status extends BlockElement {
  static readonly type = 'status'
  static readonly tag = 'ff-status'

  static override styles: CSSResultGroup = [BlockElement.styles, lookStyle, statusStyle]

  // The value of the field in the record the mask shows; null without one.
  @state() fieldValue: string | null = null

  constructor() {
    super()
    reportsHeight(this, () => this.renderRoot.querySelector('.status'))
    reportsHeads(this)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    link.disconnect(this)
  }

  override render(): TemplateResult {
    const chips = this.preview ? this.states.map((s, i) => this.chipTpl(s, i)) : this.shownTpl()
    return html`<div class="status form-${this.form === 'dot' ? 'dot' : 'chip'}">${this.labelTpl()}<div
      class="chips"
    >${chips}</div></div>`
  }

  // The state whose value the field holds; a value no state names stands as
  // it is, unless such values are left out. An empty field shows nothing.
  private shownTpl(): TemplateResult | typeof nothing {
    const value = this.fieldValue?.trim() ?? ''
    if (value === '') return nothing
    const named = this.states.find((s) => s.value.trim() === value)
    if (named) return this.chipTpl(named)
    return this.others === 'hide' ? nothing : this.chipTpl({ word: value, value, tone: 'neutral' })
  }

  private chipTpl(shown: StatusState, entry?: number): TemplateResult {
    return html`<span class="chip tone-${toneValue(shown.tone)}" data-ff-entry=${entry ?? nothing}><span
      class="dot"
    ></span><span class="word head-text">${shown.word}</span></span>`
  }

  private labelTpl(): TemplateResult | typeof nothing {
    if (!this.showLabel) return nothing
    return html`<span class="label" data-ff-editable @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
      >${this.label === '' && this.preview ? 'Beschriftung' : this.label}</span
    >`
  }
}

const VALUE_ATTR = statusProperties.valueField.attribute

const link = makeDataLink<Status>({
  hydrate: (el) => {
    const spot = readBoundSpot(el, VALUE_ATTR)
    el.fieldValue = spot.kind === 'value' ? spot.value : null
  },
})

defineBlock(Status, {
  name: 'Status',
  category: 'display',
  properties: statusProperties,
  capabilities: [{ kind: 'source' }, { kind: 'followsSelection' }, { kind: 'list', binding: STATES_BINDING }],
  grid: { startWidth: 8, startHeight: 2, minWidth: 3, minHeight: 1, heightFromContent: true },
})
