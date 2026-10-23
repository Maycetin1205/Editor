import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { reportsHeads } from '../base/headsReport'
import { reportsHeight } from '../base/heightReport'
import { chainsRead } from '../../core/data/steps/chains'
import { stepAdapter, type RuntimeStep } from '../../core/data/steps/steps'
import { makeDataLink, readDataPreamble } from '../../runtime/source'
import { firstRowToSelection } from '../../runtime/selection'
import { runEvent } from '../../runtime/events'
import { maskState } from '../../runtime/maskState'
import { holdsNumbers, shownHeld } from '../parts/column'
import { icon } from '../parts/icons'
import { LINE_CLICK_EVENTS, LINE_CLICKS, LINES_BINDING, type ValueLine } from './lines'
import { valueListProperties, type ValueListValues } from './properties'
import { valueListStyle } from './valueListStyle'

const CHAINS_ATTR = 'data-ff-actions'

export interface ValueList extends ValueListValues {}

export class ValueList extends BlockElement {
  static readonly type = 'valuelist'
  static readonly tag = 'ff-valuelist'

  static override styles: CSSResultGroup = [BlockElement.styles, valueListStyle]

  static override busyLine = true

  @state() lineValues: readonly string[] = []

  private chains: Readonly<Record<string, RuntimeStep[]>> = {}

  constructor() {
    super()
    reportsHeight(this, () => this.renderRoot.querySelector('.values'))
    reportsHeads(this)
  }

  override render(): TemplateResult {
    const parts: TemplateResult[] = []
    let run: TemplateResult[] = []
    const close = (): void => {
      if (run.length > 0) parts.push(html`<div class="lines">${run}</div>`)
      run = []
    }
    this.lines.forEach((line, i) => {
      if (line.sum === true) {
        close()
        parts.push(this.lineTpl(line, i, 'sum'))
      } else {
        run.push(this.lineTpl(line, i, 'line'))
      }
    })
    close()
    return html`<div class="values">${parts}</div>`
  }

  // In the mask a line runs its chain; in the editor a line that has one
  // shows the same sign, without the click.
  private clickOf(line: ValueLine): string | undefined {
    if (line.click === undefined) return undefined
    if (this.preview) return line.click
    return (this.chains[line.click]?.length ?? 0) > 0 ? line.click : undefined
  }

  private lineTpl(line: ValueLine, i: number, kind: 'line' | 'sum'): TemplateResult {
    const value = this.preview
      ? (this.spotTexts[`${LINES_BINDING.prop}.${i}`] ?? '')
      : shownHeld(line, this.lineValues[i] ?? '')
    const click = this.clickOf(line)
    const live = click !== undefined && !this.preview
    const run = (): void => {
      if (click !== undefined) void runEvent(this, click, {})
    }
    return html`<div
      class="${kind}${click !== undefined ? ' link' : ''}"
      data-ff-entry=${this.preview ? i : nothing}
      role=${live ? 'button' : nothing}
      tabindex=${live ? 0 : nothing}
      @click=${live ? run : nothing}
      @keydown=${
        live
          ? (e: KeyboardEvent) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              run()
            }
          : nothing
      }
    ><span
      class="label head-text"
    >${line.label}</span><span
      class="value${holdsNumbers(line) ? ' numbers' : ''}"
      ?data-ff-bound=${this.preview && line.field !== ''}
    >${value}</span>${click !== undefined ? html`<span class="go">${icon('caretRight')}</span>` : nothing}</div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
    if (!this.preview) this.readChains()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    link.disconnect(this)
  }

  private readChains(): void {
    this.chains = chainsRead(this.getAttribute(CHAINS_ATTR))
    if (Object.values(this.chains).some((chain) => chain.some((s) => stepAdapter(s.kind).answers)))
      maskState.host.start()
    this.requestUpdate()
  }
}

const link = makeDataLink<ValueList>({
  hydrate: (el) => {
    const data = readDataPreamble(el)
    const row = data === null ? undefined : firstRowToSelection(el, data.rows)
    el.lineValues =
      data === null || row === undefined
        ? []
        : el.lines.map((line) => (line.field === '' ? '' : data.read(row, line.field)))
  },
})

defineBlock(ValueList, {
  name: 'Werteliste',
  category: 'display',
  properties: valueListProperties,
  capabilities: [
    { kind: 'source' },
    { kind: 'followsSelection' },
    { kind: 'list', binding: LINES_BINDING },
    { kind: 'events', list: LINE_CLICKS, entries: LINE_CLICK_EVENTS },
  ],
  grid: { startWidth: 12, startHeight: 5, minWidth: 4, minHeight: 2, heightFromContent: true },
})
