import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import {
  BlockElement,
  CHILD_ADD,
  CHILD_REMOVE,
  defineBlock,
  type ChildAdd,
  type ChildRemove,
} from '../base/BlockElement'
import { runEvent } from '../../runtime/actions/runEvent'
import { REVEAL } from '../../runtime/reveal'
import { makeOperatorState } from '../list/operatorState'
import { icon } from '../parts/icons'
import { PAGE_CHANGED, Tab } from './Tab'
import { tabsProperties, type TabsValues } from './properties'
import { tabsStyle } from './tabsStyle'

const CHANGED = 'onTabChange'

const PAGE_WORD = 'Seite'

// The last open page, in the browser of the one who works with the mask.
const lastOpen = makeOperatorState<number>('ff_tab_open_', null, (raw) =>
  typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : null,
)

function titleOf(page: HTMLElement, at: number): string {
  const title = page instanceof Tab ? page.name : (page.getAttribute('name') ?? '')
  return title === '' ? `${PAGE_WORD} ${at + 1}` : title
}

export interface Tabs extends TabsValues {}

export class Tabs extends BlockElement {
  static readonly type = 'tabs'
  static readonly tag = 'ff-tabs'

  static override styles: CSSResultGroup = [BlockElement.styles, tabsStyle]

  static override busyLine = true

  @state() private open = 0

  private started = false

  private readonly watch = new MutationObserver(() => this.requestUpdate())

  private readonly onPageChanged = (): void => this.requestUpdate()

  // A field on a hidden page that asks to be seen (an empty required field
  // before a chain) opens its page; at once, so that its focus lands.
  private readonly onReveal = (e: Event): void => {
    const path = e.composedPath()
    const at = this.pages().findIndex((page) => path.includes(page))
    if (at < 0 || at === this.shown()) return
    this.open = at
    this.showOpen()
  }

  // The pages of this Reiter, not those of a Reiter on one of them.
  private pages(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>(Tab.tag)).filter(
      (page) => page.parentElement?.closest(Tabs.tag) === this,
    )
  }

  private shown(): number {
    return Math.max(0, Math.min(this.open, this.pages().length - 1))
  }

  // Hides every page but the open one: in the mask the page itself, on the
  // canvas the editor's frame around it.
  private showOpen(): void {
    const open = this.shown()
    this.pages().forEach((page, i) => {
      let top = page
      while (top.parentElement && top.parentElement !== this) top = top.parentElement
      top.hidden = i !== open
    })
  }

  private choose(at: number, focus: boolean): void {
    const count = this.pages().length
    if (count === 0) return
    const next = (at + count) % count
    if (focus) {
      void this.updateComplete.then(() => {
        this.renderRoot.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
      })
    }
    if (next === this.shown()) return
    this.open = next
    if (this.preview) return
    if (this.remember) lastOpen.remember(this, next)
    void runEvent(this, CHANGED, {})
  }

  private onKey(e: KeyboardEvent, at: number): void {
    if (this.preview) return
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    this.choose(at + step, true)
  }

  // On the canvas: a new page at the end, shown at once.
  private addPage(): void {
    const pages = this.pages()
    const titles = new Set(pages.map((page, i) => titleOf(page, i)))
    let n = pages.length + 1
    while (titles.has(`${PAGE_WORD} ${n}`)) n++
    this.open = pages.length
    this.dispatchEvent(
      new CustomEvent<ChildAdd>(CHILD_ADD, { detail: { type: Tab.type, values: { name: `${PAGE_WORD} ${n}` } } }),
    )
  }

  // On the canvas: the open page goes, with its blocks; the one before it
  // opens. The last page stays: a Reiter without pages is nothing.
  private removePage(at: number): void {
    if (this.pages().length < 2) return
    this.open = Math.max(0, at - 1)
    this.dispatchEvent(new CustomEvent<ChildRemove>(CHILD_REMOVE, { detail: { child: at } }))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.watch.observe(this, { childList: true, subtree: true })
    this.addEventListener(PAGE_CHANGED, this.onPageChanged)
    this.addEventListener(REVEAL, this.onReveal)
    if (this.started || this.preview) return
    this.started = true
    if (this.remember) this.open = lastOpen.read(this) ?? 0
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watch.disconnect()
    this.removeEventListener(PAGE_CHANGED, this.onPageChanged)
    this.removeEventListener(REVEAL, this.onReveal)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('chosenChild') && this.chosenChild >= 0) this.open = this.chosenChild
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.showOpen()
  }

  override render(): TemplateResult {
    const pages = this.pages()
    const open = this.shown()
    const editing = this.preview && this.editable
    return html`<div class="frame appearance-${this.appearance}">
      <div class="strip" role="tablist">
        ${pages.map(
          (page, i) => html`<button
            type="button"
            role="tab"
            class=${i === open ? 'tab open' : 'tab'}
            aria-selected=${String(i === open)}
            tabindex=${i === open ? 0 : -1}
            @click=${() => this.choose(i, false)}
            @keydown=${(e: KeyboardEvent) => this.onKey(e, i)}
          ><span
            class="title"
            data-ff-editable
            @dblclick=${(e: MouseEvent) => this.inlineEditChild(e, i, 'name')}
          >${titleOf(page, i)}</span></button>${
            editing && i === open && pages.length > 1
              ? html`<button
                type="button"
                class="drop"
                aria-label=${`Seite „${titleOf(page, i)}“ löschen`}
                title="Seite löschen"
                @click=${() => this.removePage(i)}
              >${icon('close')}</button>`
              : nothing
          }`,
        )}
        ${
          editing
            ? html`<button type="button" class="add" aria-label="Seite anfügen" title="Seite anfügen" @click=${this.addPage}>
              ${icon('plus')}
            </button>`
            : nothing
        }
      </div>
      <div class="body"><slot></slot></div>
    </div>`
  }
}

defineBlock(Tabs, {
  name: 'Reiter',
  category: 'layout',
  properties: tabsProperties,
  takesChildren: true,
  allowedChildren: [Tab.type],
  startChildren: [
    { type: Tab.type, values: { name: `${PAGE_WORD} 1` } },
    { type: Tab.type, values: { name: `${PAGE_WORD} 2` } },
  ],
  capabilities: [{ kind: 'events', list: [{ key: CHANGED, name: 'Reiter gewechselt' }] }],
  grid: { startWidth: 24, startHeight: 16, minWidth: 8, minHeight: 6 },
})
