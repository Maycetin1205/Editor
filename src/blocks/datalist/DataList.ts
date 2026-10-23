import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable } from '../../core/block/capability'
import { chooseSelection, giverIdOf, relocateSelection, rowsToSelection } from '../../runtime/selection'
import { makeDataLink, readDataPreamble, rowKeys, spotValue } from '../../runtime/source'
import { avatarStyle, cardOf, cardSpotStyle } from '../parts/card'
import { dataListStyle } from './dataListStyle'
import { dataListProperties, PICK_ONE, ROW_SPOTS, type DataListValues } from './properties'

interface Item {
  key: string
  row: unknown

  values: Readonly<Record<string, string>>
}

export interface DataList extends DataListValues {}

export class DataList extends BlockElement {
  static readonly type = 'datalist'
  static readonly tag = 'ff-datalist'

  static override styles: CSSResultGroup = [BlockElement.styles, avatarStyle, cardSpotStyle, dataListStyle]

  static override busyLine = true

  @state() private items: readonly Item[] = []

  @state() private chosen: ReadonlySet<string> = new Set()

  hydrate(): void {
    const preamble = readDataPreamble(this)
    const rows = preamble ? rowsToSelection(this, preamble.rows) : []
    const keys = preamble ? rowKeys(preamble.source, rows) : []
    this.items = preamble
      ? rows.map((row, i) => ({
          key: keys[i],
          row,
          values: {
            ...Object.fromEntries(ROW_SPOTS.map(({ prop }) =>
              [prop, spotValue('', this[`${prop}Field`], row, preamble.read)])),
            avatar: this.avatarField === '' ? '' : preamble.read(row, this.avatarField),
          },
        }))
      : []
    const hit = this.pick === 'one'
      ? relocateSelection(giverIdOf(this), this.items, (item) => item.row, (item) => item.key)
      : []
    this.chosen = new Set(hit.slice(0, 1).map((i) => this.items[i].key))
  }

  private choose(item: Item): void {
    chooseSelection(giverIdOf(this), item.row, item.key)
  }

  private row(item: Item | null): TemplateResult {
    const { shows, spot, avatar } = cardOf(this, ROW_SPOTS, (prop) => this[`${prop}Field`], this.reportSpot, item?.values ?? null)
    const content = html`${avatar()}
      <span class="ident">
        ${shows('heading') ? spot('heading', 'name') : nothing}
        ${shows('subline') ? spot('subline', 'meta') : nothing}
      </span>
      ${shows('aside') ? spot('aside', 'aside') : nothing}`
    if (item === null || this.pick !== 'one') return html`<div class="row">${content}</div>`
    const chosen = this.chosen.has(item.key)
    const pick = (): void => { this.choose(item) }
    return html`<div
      class="row${chosen ? ' chosen' : ''}"
      role="button"
      tabindex="0"
      aria-pressed=${String(chosen)}
      @click=${pick}
      @keydown=${(e: KeyboardEvent) => {
        if ((e.key !== 'Enter' && e.key !== ' ') || e.target !== e.currentTarget) return
        e.preventDefault()
        pick()
      }}
    >${content}</div>`
  }

  override render(): TemplateResult {
    return html`<div class="list pick-${this.pick}">
      ${this.preview ? this.row(null) : this.items.map((item) => this.row(item))}
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    link.disconnect(this)
  }
}

const link = makeDataLink<DataList>({
  hydrate: (el) => { el.hydrate() },
})

defineBlock(DataList, {
  name: 'Datenliste',
  category: 'display',
  properties: dataListProperties,
  capabilities: [
    { kind: 'source' },
    { kind: 'recordPick', gives: PICK_ONE },
    { kind: 'followsSelection' },
    bindable<typeof dataListProperties>(ROW_SPOTS),
  ],
  grid: { startWidth: 24, startHeight: 10, minWidth: 8, minHeight: 3 },
})
