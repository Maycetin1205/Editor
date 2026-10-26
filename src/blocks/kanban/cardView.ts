import { html, nothing, type TemplateResult } from 'lit'
import { sendPropChange, type BlockElement } from '../base/BlockElement'
import { startRename } from '../base/inlineRename'
import { asNumber, shownNumber } from '../../core/data/number'
import type { Card, CardValues } from '../parts/card'
import type { Board, CardData } from './board'
import { waitOf, type Until } from './clock'
import type { KanbanColumn } from './columns'
import type { Spot } from './places'
import type { CardSpot, KanbanValues } from './properties'

// The kanban element as its card and place views read it.
export interface KanbanElement extends BlockElement, KanbanValues {
  readonly board: Board
  cardLook: (values: CardValues) => Card<CardSpot>
}

// An amount as SoftEngine sends it, "68,50" or "68.50", shown in euros; a
// text that is no number stays as it is.
function amountText(value: string): string {
  const t = value.trim()
  if (t === '' || /[€a-z]/i.test(t)) return t
  const number = /^-?\d+\.\d{1,2}$/.test(t) ? Number(t) : asNumber(t)
  return number === null ? t : `${shownNumber(number, 2)} €`
}

function editButton(el: KanbanElement, event: MouseEvent, column: number): void {
  if (!el.editable) return
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  event.stopPropagation()
  event.preventDefault()
  startRename(target, (text, original) => {
    if (text === original) return
    const columns = el.columns.map((c, i) => (i === column ? { ...c, button: text } : c))
    sendPropChange(el, 'columns', columns)
  })
}

// Without a card (the editor's sample) the button only takes a new text.
function buttonTpl(el: KanbanElement, column: number, card: CardData | null): TemplateResult | typeof nothing {
  const columns = el.columns
  const own = columns[column]
  const next = columns[column + 1]
  if (!own || own.buttonKind === 'none' || (own.buttonKind === 'next' && !next)) return nothing
  if (card !== null && own.button.trim() === '') return nothing
  if (card === null) {
    return html`<button
      type="button"
      class="advance"
      data-ff-editable
      @dblclick=${(e: MouseEvent) => editButton(el, e, column)}
    >${own.button}</button>`
  }
  return html`<button
    type="button"
    class="advance"
    draggable="false"
    @click=${(e: MouseEvent) => {
      e.stopPropagation()
      if (own.buttonKind === 'next') el.board.advance(card)
      else el.board.press(card)
    }}
  >${own.button}</button>`
}

// The upper right corner of a card: its time, how long it waits, its
// amount or a fixed word, as the column says.
function cornerTpl(
  column: KanbanColumn | undefined,
  look: Card<CardSpot>,
  values: CardValues,
): TemplateResult | typeof nothing {
  const { shows, spot } = look
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
function footWords(
  column: KanbanColumn,
  spot: Spot,
  look: Card<CardSpot>,
  values: CardValues,
): TemplateResult | string | typeof nothing {
  const lead = column.footText.trim()
  const led = (rest: TemplateResult | string): TemplateResult => html`${lead === '' ? nothing : `${lead} `}${rest}`
  switch (column.foot) {
    case 'text':
      return lead === '' ? nothing : lead
    case 'place':
      return led(column.places[spot.place]?.name ?? column.heading)
    case 'note':
      if (values !== null && (values.note ?? '').trim() === '') return nothing
      return look.shows('note') ? led(look.spot('note', 'note')) : nothing
    default:
      return nothing
  }
}

// A choice of the places of the next column: the card moves there without
// being dragged.
function pickTpl(el: KanbanElement, spot: Spot, card: CardData | null): TemplateResult | typeof nothing {
  const next = el.columns[spot.column + 1]
  if (!el.columns[spot.column]?.placePick || !next) return nothing
  return html`<select
    class="pick"
    draggable="false"
    aria-label=${next.heading}
    ?disabled=${card === null || el.board.writes}
    @click=${(e: Event) => {
      e.stopPropagation()
    }}
    @change=${(e: Event) => {
      const select = e.target as HTMLSelectElement
      const chosen = select.value
      select.value = ''
      if (card !== null && chosen !== '') el.board.pick(card, { column: spot.column + 1, place: Number(chosen) })
    }}
  >
    <option value="" selected>${next.heading} …</option>
    ${next.places.map((place, i) => html`<option value=${i}>${place.name}</option>`)}
  </select>`
}

function footTpl(
  el: KanbanElement,
  spot: Spot,
  card: CardData | null,
  look: Card<CardSpot>,
  values: CardValues,
): TemplateResult | typeof nothing {
  const column = el.columns[spot.column]
  const button = buttonTpl(el, spot.column, card)
  const pick = pickTpl(el, spot, card)
  if (!column || (column.foot === 'none' && pick === nothing)) return button
  const words = footWords(column, spot, look, values)
  if (words === nothing && pick === nothing && button === nothing) return nothing
  return html`<div class="foot">
    <span class="foot-text">${words}</span>
    ${pick}
    ${button}
  </div>`
}

// What a card shows; without a card, the editor's sample with the names of
// its spots.
export function cardContent(el: KanbanElement, spot: Spot, card: CardData | null, until: Until | null): TemplateResult {
  const column = el.columns[spot.column]
  const values: CardValues = card === null ? null : card.values
  const look = el.cardLook(values)
  const { shows, spot: spotTpl, avatar } = look
  const line = shows('heading') || shows('subline')
  const corner = cornerTpl(column, look, values)
  const main = shows('avatar') || line || shows('heading2') || corner !== nothing
  return html`
    ${
      main
        ? html`<div class="main">
          ${avatar()}
          <div class="ident">
            ${
              line
                ? html`<div class="line">
                  ${shows('heading') ? spotTpl('heading', 'name') : nothing}
                  ${shows('subline') ? spotTpl('subline', 'meta') : nothing}
                </div>`
                : nothing
            }
            ${shows('heading2') ? spotTpl('heading2', 'heading2') : nothing}
          </div>
          ${corner}
        </div>`
        : nothing
    }
    ${shows('text') ? spotTpl('text', 'text') : nothing}
    ${shows('date') ? spotTpl('date', 'date') : nothing}
    ${until ? html`<span class="until${until.late ? ' late' : ''}">${until.text}</span>` : nothing}
    ${footTpl(el, spot, card, look, values)}`
}

export function cardTpl(el: KanbanElement, card: CardData, spot: Spot, until: Until | null): TemplateResult {
  const board = el.board
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
  >${cardContent(el, spot, card, until)}</div>`
}
