import { chooseSelection, giverIdOf, relocateSelection } from '../../runtime/selection'
import { readDataPreamble, makeDataLink, recordOf, rowKeys, type DataPreamble } from '../../runtime/source'
import { runEvent } from '../../runtime/actions/runEvent'
import { matchesSearch } from '../../runtime/searchText'
import type { KanbanColumn } from './columns'
import { placeAt, placeValue, sameCell, cellOf, type BoardCell } from './places'

export interface CardData {
  key: string
  row: unknown

  record: string

  spot: BoardCell

  values: Readonly<Record<string, string>>
}

interface BoardElement extends HTMLElement {
  columns: readonly KanbanColumn[]
  columnsField: string
  others: string
  cardValues: (row: unknown, read: DataPreamble['read']) => Record<string, string>
  requestUpdate: () => void
  arrived: (card: CardData, spot: BoardCell) => void
}

export class Board {
  cards: readonly CardData[] = []

  chosen = ''
  dragging = ''
  target: BoardCell | null = null
  writes = false

  private readonly moved = new Map<string, BoardCell>()

  private readonly el: BoardElement

  constructor(el: BoardElement) {
    this.el = el
  }

  cellOf(card: CardData): BoardCell {
    return this.moved.get(card.key) ?? card.spot
  }

  // The cards a search field of the mask leaves; the summary counts all.
  private shown(card: CardData): boolean {
    return matchesSearch(Object.values(card.values))
  }

  cardsAt(spot: BoardCell): CardData[] {
    return this.cards.filter((card) => sameCell(this.cellOf(card), spot) && this.shown(card))
  }

  cardsIn(column: number): CardData[] {
    return this.cards.filter((card) => this.cellOf(card).column === column && this.shown(card))
  }

  allAt(spot: BoardCell): CardData[] {
    return this.cards.filter((card) => sameCell(this.cellOf(card), spot))
  }

  allIn(column: number): CardData[] {
    return this.cards.filter((card) => this.cellOf(card).column === column)
  }

  isTarget(spot: BoardCell): boolean {
    return this.target !== null && sameCell(this.target, spot)
  }

  hydrate(delivery: boolean): void {
    const el = this.el
    const preamble = readDataPreamble(el)
    if (!preamble) {
      this.cards = []
      this.chosen = ''
      el.requestUpdate()
      return
    }
    const columns = el.columns
    const field = el.columnsField.trim()
    const keys = rowKeys(preamble.source, preamble.rows)
    const hideOthers = el.others === 'hide'
    this.cards = preamble.rows.flatMap((row, i) => {
      const spot = cellOf(columns, field, row, hideOthers)
      return spot === null
        ? []
        : [
            {
              key: keys[i],
              row,
              record: recordOf(preamble.source, row),
              spot,
              values: el.cardValues(row, preamble.read),
            },
          ]
    })
    if (delivery && !this.writes) this.moved.clear()
    if (!this.cards.some((card) => card.key === this.dragging)) this.endDrag()
    const hit = relocateSelection(
      giverIdOf(el),
      this.cards,
      (card) => card.row,
      (card) => card.key,
    )
    this.chosen = hit.length > 0 ? this.cards[hit[0]].key : ''
    el.requestUpdate()
  }

  choose(card: CardData): void {
    chooseSelection(giverIdOf(this.el), card.row, card.key)
    void runEvent(this.el, 'onCardClick', { PINDEX: card.record })
  }

  startDrag(event: DragEvent, card: CardData): void {
    if (this.writes) {
      event.preventDefault()
      return
    }
    this.dragging = card.key
    event.dataTransfer?.setData('text/plain', card.record)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    this.el.requestUpdate()
  }

  endDrag(): void {
    if (this.dragging === '' && this.target === null) return
    this.dragging = ''
    this.target = null
    this.el.requestUpdate()
  }

  over(event: DragEvent, spot: BoardCell): void {
    if (this.dragging === '' || this.writes) return
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    if (this.isTarget(spot)) return
    this.target = spot
    this.el.requestUpdate()
  }

  leave(event: DragEvent): void {
    const into = event.relatedTarget
    const board = event.currentTarget
    if (into instanceof Node && board instanceof Node && board.contains(into)) return
    if (this.target === null) return
    this.target = null
    this.el.requestUpdate()
  }

  advance(card: CardData): void {
    const column = this.cellOf(card).column + 1
    if (column >= this.el.columns.length) return
    void this.move(card, { column, place: 0 })
  }

  // A place of the next column, chosen on the card.
  pick(card: CardData, spot: BoardCell): void {
    void this.move(card, spot)
  }

  press(card: CardData): void {
    void runEvent(this.el, 'onCardButton', { PINDEX: card.record })
  }

  drop(event: DragEvent, spot: BoardCell): void {
    const card = this.cards.find((c) => c.key === this.dragging)
    this.endDrag()
    if (!card) return
    event.preventDefault()
    event.stopPropagation()
    void this.move(card, spot)
  }

  private async move(card: CardData, spot: BoardCell): Promise<void> {
    const columns = this.el.columns
    const column = columns[spot.column]
    const place = column?.places[spot.place]
    const from = this.cellOf(card)
    if (this.writes || !column || !place || sameCell(from, spot)) return
    const fromColumn = columns[from.column]
    const fromPlace = placeAt(columns, from)
    this.moved.set(card.key, spot)
    this.writes = true
    this.el.arrived(card, spot)
    this.el.requestUpdate()
    const result = await runEvent(this.el, 'onCardDrop', {
      PINDEX: card.record,
      VALUE: placeValue(column, place),
      FROM_VALUE: fromColumn && fromPlace ? placeValue(fromColumn, fromPlace) : '',
    })
    this.writes = false
    const back = !result.written || (result.state !== 'ran' && result.state !== 'unconfirmed')
    if (back || result.state === 'ran') this.moved.delete(card.key)
    this.el.requestUpdate()
  }
}

const link = makeDataLink<BoardElement & { board: Board }>({
  hydrate: (el, delivery) => {
    el.board.hydrate(delivery)
  },
})

export const boardRegister = link.connect
export const boardUnregister = link.disconnect
