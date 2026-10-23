import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { rowsForHeight } from '../../core/block/grid'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { icon } from '../parts/icons'
import { areaStyle, CARD_HEAD_PX } from './areaStyle'
import { closedRowsIn, foldLater, foldNow, type FoldHost } from './fold'
import { areaProperties, type AreaValues } from './properties'

const HEAD_ROWS = rowsForHeight(CARD_HEAD_PX)

export interface Area extends AreaValues {}

export class Area extends BlockElement implements FoldHost {
  static readonly type = 'area'
  static readonly tag = 'ff-area'

  static override styles: CSSResultGroup = [BlockElement.styles, areaStyle]

  static override busyLine = true

  // Only in the mask: on the canvas the area stays open, so that its blocks
  // can be reached.
  @state() private folded = false

  private started = false

  private get folds(): boolean {
    return this.appearance === 'fold' && !this.preview
  }

  foldCut(rows: number): number {
    if (this.preview) return 0
    return this.folds && this.folded ? rows - HEAD_ROWS : closedRowsIn(this)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.started || !this.folds) return
    this.started = true
    this.folded = this.startFolded
    foldLater(this)
  }

  private toggle(): void {
    if (!this.folds) return
    this.folded = !this.folded
    foldNow(this)
    if (!this.folded) {
      void this.updateComplete.then(() => {
        const body = this.renderRoot.querySelector('.body')
        if (
          body instanceof HTMLElement &&
          typeof body.animate === 'function' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches !== true
        ) {
          body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' })
        }
      })
    }
  }

  override render(): TemplateResult {
    const foldable = this.appearance === 'fold'
    const headed = this.appearance === 'headed' || foldable
    const shut = this.folds && this.folded
    const live = this.folds
    return html`<div class="frame appearance-${this.appearance}${shut ? ' shut' : ''}">
      ${
        headed
          ? html`<div
            class="head"
            role=${live ? 'button' : nothing}
            tabindex=${live ? 0 : nothing}
            aria-expanded=${live ? String(!shut) : nothing}
            @click=${live ? () => this.toggle() : nothing}
            @keydown=${
              live
                ? (e: KeyboardEvent) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    this.toggle()
                  }
                : nothing
            }
          >
            ${foldable ? html`<span class="caret">${icon('caretDown')}</span>` : nothing}
            <span
              class="head-text"
              data-ff-editable
              @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'heading')}
            >${this.heading}</span>
            ${
              foldable && this.preview && this.startFolded
                ? html`<span class="start-note">startet eingeklappt</span>`
                : nothing
            }
          </div>`
          : nothing
      }
      <div class="body" ?hidden=${shut}><slot></slot></div>
    </div>`
  }
}

defineBlock(Area, {
  name: 'Bereich',
  category: 'layout',
  properties: areaProperties,
  takesChildren: true,
  gridArea: true,
  grid: { startWidth: 24, startHeight: 12, minWidth: 4, minHeight: 3 },
})
