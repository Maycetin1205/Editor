import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { reportsHeads } from '../base/headsReport'
import { bindable } from '../../core/block/capability'
import { onSearchText } from '../../runtime/searchText'
import { lookStyle, toneValue } from '../look/look'
import { spotValue, type DataPreamble } from '../../runtime/source'
import { AVATAR_SPOT, avatarStyle, cardOf, cardSpotStyle, type Card, type CardValues } from '../parts/card'
import { Board, boardRegister, boardUnregister, type CardData } from './board'
import { KANBAN_COLUMNS_BINDING, type KanbanColumn, type KanbanPlace } from './columns'
import type { BoardCell } from './places'
import { cardsAt, count, isTaken, placeTpl } from './placeView'
import { boardStyle } from './style/board'
import { columnStyle } from './style/column'
import { placeStyle } from './style/place'
import { cardStyle } from './style/card'
import { CARD_SPOTS, kanbanProperties, type CardSpot, type KanbanValues } from './properties'

const CLOCK_TICK = 30_000

const MESSAGE_SHOWN_MS = 2_400

// The words of a column's notice with the card and its place woven in.
function noticeText(words: string, card: CardData, column: KanbanColumn, place: KanbanPlace | undefined): string {
  // Replacer functions: a heading with "$&" in it must land as typed.
  return words
    .replace(/\{titel\}/gi, () => card.values.heading ?? '')
    .replace(/\{platz\}/gi, () => place?.name ?? column.heading)
    .replace(/\{spalte\}/gi, () => column.heading)
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export interface Kanban extends KanbanValues {}

export class Kanban extends BlockElement {
  static readonly type = 'kanban'
  static readonly tag = 'ff-kanban'

  // The order counts: a place refines what a column sets (.dot, .head-text).
  static override styles: CSSResultGroup = [
    BlockElement.styles,
    lookStyle,
    avatarStyle,
    cardSpotStyle,
    boardStyle,
    columnStyle,
    placeStyle,
    cardStyle,
  ]

  static override busyLine = true

  readonly board = new Board(this)

  // How many cards the board holds, for an area that counts them in its head.
  get rowCount(): number {
    return this.board.cards.length
  }

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
    return Object.fromEntries(
      [...CARD_SPOTS, AVATAR_SPOT].map(({ prop }) => [prop, spotValue('', this[`${prop}Field`], row, read)]),
    )
  }

  // The card template of src/blocks/parts/card.ts on this board's fields;
  // here, because reportSpot is only reachable from inside the element.
  cardLook(values: CardValues): Card<CardSpot> {
    return cardOf(this, CARD_SPOTS, (prop) => this[`${prop}Field`], this.reportSpot, values)
  }

  // A card came to a column: its notice shows for a moment.
  arrived(card: CardData, spot: BoardCell): void {
    const column = this.columns[spot.column]
    if (!column || column.notice.trim() === '') return
    this.message = noticeText(column.notice, card, column, column.places[spot.place])
    clearTimeout(this.messageTimer)
    this.messageTimer = setTimeout(() => {
      this.message = ''
      this.requestUpdate()
    }, MESSAGE_SHOWN_MS)
  }

  // One pill a column above the board: its cards, or for places shown taken
  // or free, how many are taken.
  private summaryTpl(): TemplateResult {
    return html`<div class="summary">${this.columns.map((column, i) => {
      const byOccupancy = column.occupancy && column.places.length > 1
      const taken = column.places.filter((_, p) => isTaken(this, { column: i, place: p })).length
      const shown =
        this.preview && !byOccupancy
          ? ''
          : byOccupancy
            ? `${taken} / ${column.places.length}`
            : this.board.allIn(i).length
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
          const only: BoardCell = { column: i, place: 0 }
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
              <span class="count">${count(this, board.cardsIn(i))}</span>
            </div>
            ${subtitle === '' ? nothing : html`<div class="sub">${subtitle}</div>`}
            <div class="body">
              ${
                single
                  ? cardsAt(this, only)
                  : column.places.map((place, p) => placeTpl(this, { column: i, place: p }, place))
              }
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
    this.unlistenSearch ??= onSearchText(() => {
      this.requestUpdate()
    })
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
    this.message = ''
  }
}

defineBlock(Kanban, {
  name: 'Kanban',
  category: 'display',
  properties: kanbanProperties,
  capabilities: [
    { kind: 'source', helpers: 'beside' },
    { kind: 'recordChoice' },
    { kind: 'list', binding: KANBAN_COLUMNS_BINDING },
    bindable<typeof kanbanProperties>([...CARD_SPOTS, AVATAR_SPOT]),
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
