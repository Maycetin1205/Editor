import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { rowsForHeight } from '../../core/block/grid'
import type { SourceValue } from '../../core/block/sourceProperty'
import { chainsRead } from '../../core/data/steps/chains'
import { stepAdapter } from '../../core/data/steps/steps'
import { readBoundSpot } from '../../runtime/boundSpot'
import { runEvent } from '../../runtime/events'
import { maskState } from '../../runtime/maskState'
import { NOTICE_REASON_ATTR } from '../../runtime/notice'
import { rowsToSelection, selectionFor, selectionGiverOf } from '../../runtime/selection'
import { makeDataLink, readDataPreamble, sourceIdOf } from '../../runtime/source'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { makeOperatorState } from '../list/operatorState'
import { icon } from '../parts/icons'
import { areaStyle, CARD_HEAD_PX } from './areaStyle'
import { closedRowsIn, foldLater, foldNow, type FoldHost } from './fold'
import { areaProperties, type AreaValues } from './properties'

const HEAD_ROWS = rowsForHeight(CARD_HEAD_PX)

const EMPTY_BUTTON = 'onEmptyButton'
const CHAINS_ATTR = 'data-ff-actions'
const META_FIELD_ATTR = 'metafield'

// What the area holds once its source answered: rows; none, because nothing
// is chosen in the list it follows; or none at all.
type Standing = 'rows' | 'nothingChosen' | 'noRows'

const rememberedFold = makeOperatorState<boolean>('ff_fold_', 'ff_fold_', (raw) =>
  typeof raw === 'boolean' ? raw : null,
)

// The rows of the first list inside, for the count in the head.
function countedRows(root: Element): number {
  for (const el of root.querySelectorAll('*')) {
    const rows = (el as { rowCount?: unknown }).rowCount
    if (typeof rows === 'number') return rows
  }
  return 0
}

export interface Area extends AreaValues, SourceValue {}

export class Area extends BlockElement implements FoldHost {
  static readonly type = 'area'
  static readonly tag = 'ff-area'

  static override styles: CSSResultGroup = [BlockElement.styles, areaStyle]

  static override busyLine = true

  // Only in the mask: on the canvas the area stays open and calm, so that
  // its blocks can be reached.
  @state() private folded = false

  @state() private standing: Standing = 'rows'

  @state() private metaValue = ''

  @state() private count = 0

  private started = false

  private get headed(): boolean {
    return this.kind === 'headed'
  }

  private get folds(): boolean {
    return this.headed && this.foldable && !this.preview
  }

  private get failed(): boolean {
    return !this.preview && this.notice === 'Fehler'
  }

  private get hides(): boolean {
    return !this.preview && this.hideWhenEmpty && this.standing !== 'rows' && !this.failed
  }

  foldCut(rows: number): number {
    if (this.preview) return 0
    if (this.hides) return rows
    if (this.folds && this.folded) return rows - HEAD_ROWS
    return closedRowsIn(this)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
    if (this.started) return
    this.started = true
    if (this.preview) return
    this.wireChains()
    this.addEventListener('keydown', this.onKey)
    if (this.folds) {
      const kept = this.rememberFold ? rememberedFold.read(this) : null
      this.folded = kept ?? this.startFolded
    }
    if (this.folds || this.hideWhenEmpty) foldLater(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    link.disconnect(this)
  }

  hydrate(): void {
    if (this.preview) return
    const was = this.standing
    this.standing = this.standingNow()
    this.metaValue = this.metaValueNow()
    queueMicrotask(() => {
      this.count = countedRows(this)
    })
    if (this.hideWhenEmpty && was !== this.standing) foldNow(this)
  }

  private standingNow(): Standing {
    if (sourceIdOf(this) === '') return 'rows'
    const preamble = readDataPreamble(this)
    if (!preamble) return 'rows'
    const givers = selectionGiverOf(this)
    if (givers.length > 0 && givers.every((id) => selectionFor(id) === undefined)) return 'nothingChosen'
    return rowsToSelection(this, preamble.rows).length === 0 ? 'noRows' : 'rows'
  }

  private metaValueNow(): string {
    if (this.meta !== 'field') return ''
    const spot = readBoundSpot(this, META_FIELD_ATTR)
    return spot.kind === 'value' ? spot.value : ''
  }

  private wireChains(): void {
    const chains = chainsRead(this.getAttribute(CHAINS_ATTR))
    if (Object.values(chains).some((chain) => chain.some((s) => stepAdapter(s.kind).answers))) maskState.host.start()
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || !this.folds) return
    e.preventDefault()
    this.setFolded(e.key === 'ArrowUp')
  }

  private toggle(): void {
    this.setFolded(!this.folded)
  }

  private setFolded(folded: boolean): void {
    if (!this.folds || folded === this.folded) return
    this.folded = folded
    if (this.rememberFold) rememberedFold.remember(this, folded)
    foldNow(this)
  }

  private retry(): void {
    maskState.host.requestFreshData()
  }

  private pressEmptyButton(): void {
    void runEvent(this, EMPTY_BUTTON, {})
  }

  private foldTpl(shut: boolean): TemplateResult | typeof nothing {
    if (!this.headed || !this.foldable) return nothing
    return html`<button
      type="button"
      class="fold"
      aria-expanded=${String(!shut)}
      aria-label=${shut ? 'Aufklappen' : 'Zuklappen'}
      ?disabled=${this.preview}
      @click=${this.toggle}
    >${icon('caretDown')}</button>`
  }

  private metaTpl(): TemplateResult | typeof nothing {
    if (this.meta === 'text') {
      return this.metaText.trim() === '' ? nothing : html`<span class="meta">${this.metaText}</span>`
    }
    if (this.meta === 'field') {
      const shown = this.preview ? this.metaFieldName || this.metaField : this.metaValue
      return shown === '' ? nothing : html`<span class="meta">${shown}</span>`
    }
    if (this.meta === 'count') {
      return html`<span class="meta"><span class="chip">${this.preview ? 0 : this.count} ${this.countWord}</span></span>`
    }
    return nothing
  }

  private bodyTpl(): TemplateResult {
    if (this.failed) {
      return html`<div class="alert" role="alert">
        ${icon('warning')}
        <span class="alert-text"><b>Nicht geladen.</b> ${this.getAttribute(NOTICE_REASON_ATTR) ?? ''}</span>
        ${this.offerRetry ? html`<button type="button" class="btn" @click=${this.retry}>Erneut laden</button>` : nothing}
      </div>`
    }
    if (this.preview || this.standing === 'rows') return html`<slot></slot>`
    return html`<div class="empty">
      ${icon('info')}
      <span class="empty-title">${this.emptyTitle}</span>
      ${this.emptyHint.trim() === '' ? nothing : html`<span class="empty-hint">${this.emptyHint}</span>`}
      ${
        this.emptyButton.trim() === ''
          ? nothing
          : html`<button type="button" class="btn" @click=${this.pressEmptyButton}>${this.emptyButton}</button>`
      }
    </div>`
  }

  override render(): TemplateResult {
    const shut = this.folds && this.folded
    const calm = this.preview || (this.standing === 'rows' && !this.failed)
    const area = `area kind-${this.kind}${shut ? ' shut' : ''}`
    const body = `body${calm ? '' : this.failed ? ' state failed' : ' state'}`
    return html`<div class=${area}>
      ${
        this.headed
          ? html`<div class="head">
            ${this.foldTpl(shut)}
            <span
              class="title"
              data-ff-editable
              @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'heading')}
            >${this.heading}</span>
            ${this.metaTpl()}
          </div>`
          : nothing
      }
      <div class=${body} ?hidden=${shut}>${this.bodyTpl()}</div>
    </div>`
  }
}

const link = makeDataLink<Area>({
  hydrate: (el) => {
    el.hydrate()
  },
})

defineBlock(Area, {
  name: 'Bereich',
  category: 'layout',
  properties: areaProperties,
  capabilities: [
    { kind: 'source', after: 'countWord' },
    { kind: 'followsSelection' },
    { kind: 'events', list: [{ key: EMPTY_BUTTON, name: 'Knopf bei leer' }] },
  ],
  takesChildren: true,
  gridArea: true,
  grid: { startWidth: 24, startHeight: 12, minWidth: 4, minHeight: 3 },
})
