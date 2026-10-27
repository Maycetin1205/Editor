import { html, nothing, svg, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable, bindingAttr } from '../../core/block/capability'
import { readBoundSpot } from '../../runtime/boundSpot'
import { makeDataLink } from '../../runtime/source'
import { runEvent } from '../../runtime/actions/runEvent'
import { maskHost } from '../../runtime/host'
import {
  fileNameOf,
  imageLibrary,
  loadsInBrowser,
  pictureAsk,
  pictureFromVar,
  pictureUrl,
  PICTURE_ALIAS_ATTR,
  PICTURE_RELATIONS,
} from './address'
import { pictureStyle } from './pictureStyle'
import { pictureProperties, type PictureValues } from './properties'

const ALIGNS = ['left', 'center', 'right']

const PICTURE_BINDING = bindingAttr('picture')

const CLICK = 'onClick'
const CHAINS_ATTR = 'data-ff-actions'

const SIGN = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>`

// Where a picture of the mask stands, said in the box where none shows.
type Standing = 'waiting' | 'shown' | 'noValue' | 'noPicture'

const SAYS: Readonly<Record<Exclude<Standing, 'shown'>, string>> = {
  waiting: 'Warte auf SoftEngine …',
  noValue: 'Kein Bild hinterlegt',
  noPicture: 'SoftEngine hat kein Bild geliefert',
}

let asks = 0

export interface Picture extends PictureValues {}

export class Picture extends BlockElement {
  static readonly type = 'image'
  static readonly tag = 'ff-image'

  static override styles: CSSResultGroup = [BlockElement.styles, pictureStyle]

  // What the field delivered, or what SoftEngine gave for its value.
  @state() fieldValue = ''

  @state() private standing: Standing = 'waiting'

  // The address that would not load; another one gets its chance.
  @state() private failed = ''

  private wired = false

  private asked = ''

  private readonly origin = `bild ${++asks}`

  private generation = 0

  private get bound(): boolean {
    return this.pictureField !== ''
  }

  private get url(): string {
    if (this.preview) return !this.bound && loadsInBrowser(this.picture) ? this.picture.trim() : ''
    const address = this.bound ? this.fieldValue : this.picture
    return pictureUrl(address, imageLibrary(this.ownerDocument), this.bound)
  }

  override render(): TemplateResult {
    const align = ALIGNS.includes(this.align) ? this.align : 'center'
    const url = this.url
    const frame = {
      frame: true,
      [`align-${align}`]: true,
      cover: this.fit === 'cover',
      rounded: this.rounded,
    }
    return html`<div class=${classMap(frame)} data-ff-spot="picture" @click=${this.reportSpot}>${
      url !== '' && url !== this.failed
        ? html`<img
          src=${url}
          alt=${this.description}
          title=${this.description === '' ? nothing : this.description}
          @error=${() => {
            this.failed = url
          }}
        >`
        : this.preview
          ? this.editorEmptyTpl(url)
          : this.maskEmptyTpl(url)
    }</div>`
  }

  // In the mask: in small, calm words why no picture shows.
  private maskEmptyTpl(url: string): TemplateResult {
    if (url !== '' && url === this.failed) {
      return html`<div class="empty">${SIGN}<span class="what">Bild nicht gefunden</span><span class="how">${url}</span></div>`
    }
    const standing = !this.bound ? (this.picture.trim() === '' ? 'noValue' : 'waiting') : this.standing
    return html`<div class="empty">${SIGN}<span class="what">${SAYS[standing === 'shown' ? 'noPicture' : standing]}</span></div>`
  }

  private editorEmptyTpl(url: string): TemplateResult {
    if (this.bound) {
      const name = this.spotTexts.picture ?? this.picture
      const by = PICTURE_RELATIONS[this.fetch]?.name ?? (this.fetch === 'other' ? `Relation ${this.relationNr}` : '')
      return html`<div class="empty">${SIGN}<span class="what" data-ff-bound>${by === '' ? html`Bild aus „${name}“` : html`${by} zu „${name}“`}</span></div>`
    }
    const typed = this.picture.trim()
    if (typed === '') {
      return html`<div class="empty">${SIGN}<span class="what">Bild</span><span class="how">Bilddatei eintragen oder hier klicken und ein Feld wählen</span></div>`
    }
    if (url !== '') {
      return html`<div class="empty">${SIGN}<span class="what">Bild nicht gefunden</span><span class="how">${typed}</span></div>`
    }
    return html`<div class="empty">${SIGN}<span class="what">${fileNameOf(typed)}</span><span class="how">zeigt sich in SoftEngine</span></div>`
  }

  private take(picture: string, standing: Standing): void {
    this.fieldValue = picture
    this.standing = picture.trim() === '' ? standing : 'shown'
  }

  // The value of the field is the picture, or the number SoftEngine turns
  // into one: first what it gave under the alias of the export in Daten.Var,
  // else asked live. Only a new number asks again; a late answer to an old
  // one is dropped.
  show(value: string): void {
    const key = value.trim()
    if (this.fetch === 'field') {
      this.take(value, 'noValue')
      return
    }
    const given = pictureFromVar(this.ownerDocument, this.getAttribute(PICTURE_ALIAS_ATTR) ?? '')
    if (given !== undefined && given.trim() !== '') {
      this.asked = key
      this.generation++
      this.take(given, 'noPicture')
      return
    }
    if (key === '') {
      this.asked = ''
      this.generation++
      this.take('', 'noValue')
      return
    }
    if (key === this.asked) return
    this.asked = key
    const generation = ++this.generation
    const ask = pictureAsk(this.fetch, this.relationNr, this.moreValues)
    if (ask === null) {
      this.take('', 'noPicture')
      return
    }
    this.fieldValue = ''
    this.standing = 'waiting'
    void maskHost()
      .runRelation(ask.relation, [key, ...ask.more], { origin: this.origin, selibGet: true })
      .then((answer) => {
        if (generation === this.generation) this.take(answer.failed === true ? '' : answer.value, 'noPicture')
      })
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
    this.wireClick()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    link.disconnect(this)
  }

  private wireClick(): void {
    if (this.wired || this.preview || !this.hasAttribute(CHAINS_ATTR)) return
    this.wired = true
    this.addEventListener('click', () => {
      void runEvent(this, CLICK, {})
    })
  }
}

const link = makeDataLink<Picture>({
  hydrate: (el) => {
    const spot = readBoundSpot(el, PICTURE_BINDING)
    if (spot.kind === 'unbound') return
    el.show(spot.kind === 'value' ? spot.value : '')
  },
})

defineBlock(Picture, {
  name: 'Bild',
  category: 'display',
  properties: pictureProperties,
  capabilities: [
    { kind: 'source', after: 'picture' },
    { kind: 'followsSelection' },
    bindable<typeof pictureProperties>([{ prop: 'picture', name: 'Bild' }]),
    { kind: 'events', list: [{ key: CLICK, name: 'Klick' }] },
  ],
  grid: { startWidth: 8, startHeight: 6, minWidth: 2, minHeight: 2 },
})
