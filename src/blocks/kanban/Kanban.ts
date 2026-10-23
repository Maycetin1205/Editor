import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock, sendPropChange } from '../base/BlockElement'
import { startRename } from '../base/inlineRename'
import { reportsHeads } from '../base/headsReport'
import { bindable } from '../../core/block/capability'
import { asNumber, shownNumber } from '../../core/data/number'
import { onSearchText } from '../../runtime/searchText'
import { lookStyle, toneValue } from '../look/look'
import { spotValue, type DataPreamble } from '../../runtime/source'
import { avatarStyle, cardOf, cardSpotStyle, type Card, type CardValues } from '../parts/card'
import { Board, boardRegister, boardUnregister, type CardData } from './board'
import { cardsByClock, SAMPLE_HOUR_LINE, SAMPLE_UNTIL, waitOf, type Until } from './clock'
import { KANBAN_COLUMNS_BINDING, type KanbanColumn, type KanbanPlace } from './columns'
import type { Spot } from './places'
import { kanbanStyle } from './kanbanStyle'
import { CARD_SPOTS, kanbanProperties, type CardSpot, type KanbanValues } from './properties'

const CLOCK_TICK = 30_000

const MESSAGE_SHOWN_MS = 2_400

// An amount as SoftEngine sends it, "68,50" or "68.50", shown in euros; a
// text that is no number stays as it is.
function amountText(value: string): string {
  const t = value.trim()
  if (t === '' || /[€a-z]/i.test(t)) return t
  const number = /^-?\d+\.\d{1,2}$/.test(t) ? Number(t) : asNumber(t)
  return number === null ? t : `${shownNumber(number, 2)} €`
}

// The words of a column's notice with the card and its place woven in.
function noticeText(words: string, card: CardData, column: KanbanColumn, place: KanbanPlace | undefined): string {
  return words
    .replace(/\{titel\}/gi, card.values.heading ?? '')
    .replace(/\{platz\}/gi, place?.name ?? column.heading)
    .replace(/\{spalte\}/gi, column.heading)
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export interface Kanban extends KanbanValues {}

export class Kanban extends BlockElement {
  static readonly type = 'kanban'
  static readonly tag = 'ff-kanban'

  static override styles: CSSResultGroup = [BlockElement.styles, lookStyle, avatarStyle, cardSpotStyle, kanbanStyle]

  static override busyLine = true

  readonly board = new Board(this)

  private clock: ReturnType<typeof setInterval> | null = null

  private unlistenSearch: (() => void) | null = null

  // What the column a card came to says, for a moment at the foot.
  private message = ''

  private messageTimer: ReturnType<typeof setTimeout> | undefined

  constructor() {
    super()
    reportsHeads(this)
  }

  cardValues(row: unknown, read: DataPreamble['read']): Record<string, string> {
    const bound = Object.fromEntries(CARD_SPOTS.map(({ prop }) =>
      [prop, spotValue('', this[`${prop}Field`], row, read)]))
    return { ...bound, avatar: this.avatarField === '' ? '' : read(row, this.avatarField) }
  }

  // A card came to a column: its notice shows for a moment.
  arrived(card: CardData, spot: Spot): void {
    const column = this.columns[spot.column]
    if (!column || column.notice.trim() === '') return
    this.message = noticeText(column.notice, card, column, column.places[spot.place])
    clearTimeout(this.messageTimer)
    this.messageTimer = setTimeout(() => {
      this.message = ''
      this.requestUpdate()
    }, MESSAGE_SHOWN_MS)
  }

  private button(column: number, card: CardData | null): TemplateResult | typeof nothing {
    const columns = this.columns
    const own = columns[column]
    const next = columns[column + 1]
    if (!own || own.buttonKind === 'none' || (own.buttonKind === 'next' && !next)) return nothing
    if (card !== null && own.button.trim() === '') return nothing
    if (card === null) {
      return html`<button
        type="button"
        class="advance"
        data-ff-editable
        @dblclick=${(e: MouseEvent) => this.editButton(e, column)}
      >${own.button}</button>`
    }
    return html`<button
      type="button"
      class="advance"
      draggable="false"
      @click=${(e: MouseEvent) => {
        e.stopPropagation()
        if (own.buttonKind === 'next') this.board.advance(card)
        else this.board.press(card)
      }}
    >${own.button}</button>`
  }

  private editButton(event: MouseEvent, column: number): void {
    if (!this.editable) return
    const target = event.currentTarget
    if (!(target instanceof HTMLElement)) return
    event.stopPropagation()
    event.preventDefault()
    startRename(target, (text, original) => {
      if (text === original) return
      const columns = this.columns.map((c, i) => (i === column ? { ...c, button: text } : c))
      sendPropChange(this, 'columns', columns)
    })
  }

  // The upper right corner of a card: its time, how long it waits, its
  // amount or a fixed word, as the column says.
  private corner(column: KanbanColumn | undefined, card: Card<CardSpot>, values: CardValues): TemplateResult | typeof nothing {
    const { shows, spot } = card
    switch (column?.corner ?? 'time') {
      case 'time':
        return shows('time') ? spot('time', 'corner time') : nothing
      case 'wait': {
        if (values === null) return shows('since') ? spot('since', 'corner wait') : nothing
        const waited = waitOf((values.since ?? '').trim() || (values.time ?? ''), new Date())
        return waited === null ? nothing : html`<span class="corner wait">${waited}</span>`
      }
      case 'amount':
        if (values === null) return shows('amount') ? spot('amount', 'corner amount') : nothing
        return shows('amount') ? html`<span class="corner amount">${amountText(values.amount ?? '')}</span>` : nothing
      case 'text': {
        const text = column?.cornerText.trim() ?? ''
        return text === '' ? nothing : html`<span class="corner">${text}</span>`
      }
      default:
        return nothing
    }
  }

  // The words in the foot of a card: the place it stands in, its note or a
  // fixed text; a text before place or note leads them in.
  private footWords(spot: Spot, card: Card<CardSpot>, values: CardValues): TemplateResult | string | typeof nothing {
    const column = this.columns[spot.column]
    if (!column) return nothing
    const lead = column.footText.trim()
    const led = (rest: TemplateResult | string): TemplateResult => html`${lead === '' ? nothing : `${lead} `}${rest}`
    switch (column.foot) {
      case 'text':
        return lead === '' ? nothing : lead
      case 'place':
        return led(column.places[spot.place]?.name ?? column.heading)
      case 'note':
        if (values !== null && (values.note ?? '').trim() === '') return nothing
        return card.shows('note') ? led(card.spot('note', 'note')) : nothing
      default:
        return nothing
    }
  }

  // A choice of the places of the next column, as the room for a patient
  // who waits.
  private pick(spot: Spot, card: CardData | null): TemplateResult | typeof nothing {
    const next = this.columns[spot.column + 1]
    if (!this.columns[spot.column]?.placePick || !next) return nothing
    return html`<select
      class="pick"
      draggable="false"
      aria-label=${next.heading}
      ?disabled=${card === null || this.board.writes}
      @click=${(e: Event) => { e.stopPropagation() }}
      @change=${(e: Event) => {
        const select = e.target as HTMLSelectElement
        const chosen = select.value
        select.value = ''
        if (card !== null && chosen !== '') this.board.pick(card, { column: spot.column + 1, place: Number(chosen) })
      }}
    >
      <option value="" selected>${next.heading} …</option>
      ${next.places.map((place, i) => html`<option value=${i}>${place.name}</option>`)}
    </select>`
  }

  private foot(spot: Spot, card: CardData | null, look: Card<CardSpot>, values: CardValues): TemplateResult | typeof nothing {
    const column = this.columns[spot.column]
    const button = this.button(spot.column, card)
    const pick = this.pick(spot, card)
    if (!column || (column.foot === 'none' && pick === nothing)) return button
    const words = this.footWords(spot, look, values)
    if (words === nothing && pick === nothing && button === nothing) return nothing
    return html`<div class="foot">
      <span class="foot-text">${words}</span>
      ${pick}
      ${button}
    </div>`
  }

  private cardContent(spot: Spot, card: CardData | null, until: Until | null): TemplateResult {
    const column = this.columns[spot.column]
    const values: CardValues = card === null ? null : card.values
    const look = cardOf(this, CARD_SPOTS, (prop) => this[`${prop}Field`], this.reportSpot, values)
    const { shows, spot: spotTpl, avatar } = look
    const line = shows('heading') || shows('subline')
    const corner = this.corner(column, look, values)
    const main = shows('avatar') || line || shows('heading2') || corner !== nothing
    return html`
      ${main
        ? html`<div class="main">
            ${avatar()}
            <div class="ident">
              ${line
                ? html`<div class="line">
                    ${shows('heading') ? spotTpl('heading', 'name') : nothing}
                    ${shows('subline') ? spotTpl('subline', 'meta') : nothing}
                  </div>`
                : nothing}
              ${shows('heading2') ? spotTpl('heading2', 'owner') : nothing}
            </div>
            ${corner}
          </div>`
        : nothing}
      ${shows('text') ? spotTpl('text', 'text') : nothing}
      ${shows('date') ? spotTpl('date', 'date') : nothing}
      ${until ? html`<span class="until${until.late ? ' late' : ''}">${until.text}</span>` : nothing}
      ${this.foot(spot, card, look, values)}`
  }

  private cardTpl(card: CardData, spot: Spot, until: Until | null): TemplateResult {
    const board = this.board
    const chosen = card.key === board.chosen
    return html`<div
      class="card${chosen ? ' chosen' : ''}${card.key === board.dragging ? ' dragging' : ''}"
      role="button"
      tabindex="0"
      aria-pressed=${String(chosen)}
      draggable=${board.writes ? 'false' : 'true'}
      @click=${() => board.choose(card)}
      @keydown=${(e: KeyboardEvent) => {
        if ((e.key !== 'Enter' && e.key !== ' ') || e.target !== e.currentTarget) return
        e.preventDefault()
        board.choose(card)
      }}
      @dragstart=${(e: DragEvent) => board.startDrag(e, card)}
      @dragend=${() => board.endDrag()}
    >${this.cardContent(spot, card, until)}</div>`
  }

  private empty(column: KanbanColumn | undefined): TemplateResult | typeof nothing {
    const text = column?.empty.trim() ?? ''
    return text === '' ? nothing : html`<div class="empty">${text}</div>`
  }

  private cardsAt(spot: Spot): TemplateResult | TemplateResult[] | typeof nothing {
    const column = this.columns[spot.column]
    const byTime = column?.byTime === true
    if (this.preview) {
      if (spot.place !== 0) return this.empty(column)
      return html`${byTime ? SAMPLE_HOUR_LINE : nothing}<div class="card">${
        this.cardContent(spot, null, byTime ? SAMPLE_UNTIL : null)
      }</div>`
    }
    const cards = this.board.cardsAt(spot)
    if (cards.length === 0) return this.empty(column)
    if (!byTime) return cards.map((card) => this.cardTpl(card, spot, null))
    return cardsByClock(cards, (card, until) => this.cardTpl(card, spot, until))
  }

  private count(cards: readonly CardData[]): string | number {
    return this.preview ? '' : cards.length
  }

  // Whether a place holds a card, whatever a search leaves.
  private taken(spot: Spot): boolean {
    return this.preview ? spot.place === 0 : this.board.allAt(spot).length > 0
  }

  private placeTpl(spot: Spot, place: KanbanPlace): TemplateResult {
    const board = this.board
    const column = this.columns[spot.column]
    const occupancy = column?.occupancy === true
    const taken = occupancy && this.taken(spot)
    const subtitle = place.subtitle.trim()
    return html`<div
      class="place${board.isTarget(spot) ? ' target' : ''}${occupancy ? (taken ? ' taken' : ' free') : ''}"
      @dragover=${(e: DragEvent) => board.over(e, spot)}
      @drop=${(e: DragEvent) => board.drop(e, spot)}
    >
      <div class="place-head" data-ff-entry="${spot.column}.${spot.place}">
        ${occupancy ? html`<span class="dot"></span>` : nothing}
        <span class="head-text">${place.name}</span>
        ${subtitle === '' ? nothing : html`<span class="place-sub">${subtitle}</span>`}
        ${occupancy
          ? html`<span class="state">${taken ? 'Belegt' : 'Frei'}</span>`
          : html`<span class="place-count">${this.count(board.cardsAt(spot))}</span>`}
      </div>
      <div class="place-body">${this.cardsAt(spot)}</div>
    </div>`
  }

  // One pill a column above the board: its cards, or for rooms how many
  // are taken.
  private summaryTpl(): TemplateResult {
    return html`<div class="summary">${this.columns.map((column, i) => {
      const rooms = column.occupancy && column.places.length > 1
      const taken = column.places.filter((_, p) => this.taken({ column: i, place: p })).length
      const shown = this.preview && !rooms ? '' : rooms ? `${taken} / ${column.places.length}` : this.board.allIn(i).length
      return html`<span class="pill tone-${toneValue(column.tone)}">
        <span class="dot"></span>
        <span class="pill-name">${column.heading}</span>
        <span class="pill-count">${shown}</span>
      </span>`
    })}</div>`
  }

  override render(): TemplateResult {
    const board = this.board
    return html`
      ${this.summary ? this.summaryTpl() : nothing}
      <div class="board" aria-busy=${String(board.writes)} @dragleave=${(e: DragEvent) => board.leave(e)}>
        ${this.columns.map((column, i) => {
          const only: Spot = { column: i, place: 0 }
          const single = column.places.length === 1
          const subtitle = column.subtitle.trim()
          return html`<div
            class="column tone-${toneValue(column.tone)}${single && board.isTarget(only) ? ' target' : ''}"
            @dragover=${single ? (e: DragEvent) => board.over(e, only) : nothing}
            @drop=${single ? (e: DragEvent) => board.drop(e, only) : nothing}
          >
            <div class="head" data-ff-entry=${i}>
              <span class="dot"></span>
              <span class="head-text">${column.heading}</span>
              <span class="count">${this.count(board.cardsIn(i))}</span>
            </div>
            ${subtitle === '' ? nothing : html`<div class="sub">${subtitle}</div>`}
            <div class="body">
              ${single
                ? this.cardsAt(only)
                : column.places.map((place, p) => this.placeTpl({ column: i, place: p }, place))}
            </div>
          </div>`
        })}
      </div>
      ${this.message === '' ? nothing : html`<div class="message" role="status">${this.message}</div>`}`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    boardRegister(this)
    if (this.preview) return
    this.unlistenSearch ??= onSearchText(() => { this.requestUpdate() })
    if (this.clock !== null) return
    this.clock = setInterval(() => {
      if (this.board.dragging !== '' || !this.columns.some((c) => c.byTime || c.corner === 'wait')) return
      this.requestUpdate()
    }, CLOCK_TICK)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    boardUnregister(this)
    if (this.clock !== null) clearInterval(this.clock)
    this.clock = null
    this.unlistenSearch?.()
    this.unlistenSearch = null
    clearTimeout(this.messageTimer)
  }
}

defineBlock(Kanban, {
  name: 'Kanban',
  category: 'display',
  properties: kanbanProperties,
  capabilities: [
    { kind: 'source', helpers: 'beside' },
    { kind: 'recordPick' },
    { kind: 'list', binding: KANBAN_COLUMNS_BINDING },
    bindable<typeof kanbanProperties>(CARD_SPOTS),
    {
      kind: 'events',
      list: [
        { key: 'onCardClick', name: 'Karte angeklickt' },
        { key: 'onCardDrop', name: 'Karte verschoben' },
        { key: 'onCardButton', name: 'Knopf angeklickt' },
      ],
    },
  ],
  grid: { startWidth: 48, startHeight: 20, minWidth: 12, minHeight: 8, grows: true },
})
