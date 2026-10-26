import { html, nothing, type TemplateResult } from 'lit'
import type { CardData } from './board'
import { cardContent, cardTpl, type KanbanElement } from './cardView'
import { cardsByClock, SAMPLE_HOUR_LINE, SAMPLE_UNTIL } from './clock'
import type { KanbanColumn, KanbanPlace } from './columns'
import type { Spot } from './places'

function empty(column: KanbanColumn | undefined): TemplateResult | typeof nothing {
  const text = column?.empty.trim() ?? ''
  return text === '' ? nothing : html`<div class="empty">${text}</div>`
}

// The cards of a place; in the editor one sample card in the first place.
export function cardsAt(el: KanbanElement, spot: Spot): TemplateResult | TemplateResult[] | typeof nothing {
  const column = el.columns[spot.column]
  const byTime = column?.byTime === true
  if (el.preview) {
    if (spot.place !== 0) return empty(column)
    return html`${byTime ? SAMPLE_HOUR_LINE : nothing}<div class="card">${cardContent(
      el,
      spot,
      null,
      byTime ? SAMPLE_UNTIL : null,
    )}</div>`
  }
  const cards = el.board.cardsAt(spot)
  if (cards.length === 0) return empty(column)
  if (!byTime) return cards.map((card) => cardTpl(el, card, spot, null))
  return cardsByClock(cards, (card, until) => cardTpl(el, card, spot, until))
}

export function count(el: KanbanElement, cards: readonly CardData[]): string | number {
  return el.preview ? '' : cards.length
}

// Whether a place holds a card, whatever a search leaves.
export function isTaken(el: KanbanElement, spot: Spot): boolean {
  return el.preview ? spot.place === 0 : el.board.allAt(spot).length > 0
}

export function placeTpl(el: KanbanElement, spot: Spot, place: KanbanPlace): TemplateResult {
  const board = el.board
  const column = el.columns[spot.column]
  const occupancy = column?.occupancy === true
  const taken = occupancy && isTaken(el, spot)
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
      ${
        occupancy
          ? html`<span class="state">${taken ? 'Belegt' : 'Frei'}</span>`
          : html`<span class="place-count">${count(el, board.cardsAt(spot))}</span>`
      }
    </div>
    <div class="place-body">${cardsAt(el, spot)}</div>
  </div>`
}
