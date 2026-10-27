import { html, nothing, type TemplateResult } from 'lit'
import { ref } from 'lit/directives/ref.js'
import { styleMap } from 'lit/directives/style-map.js'
import { asNumber, numberText } from '../../../core/data/number'
import type { Split, SplitColumn } from '../../../core/data/split'
import { maskHost } from '../../../runtime/host'
import { alignSuggestionsFrom } from '../../lookup/suggestionList'
import { splitColumnText, splitTone } from './splitRecords'
import { SPLIT_DECIMALS, type SplitState } from './splitState'

interface SplitAct {
  key: (e: KeyboardEvent) => void
  toggle: (index: number) => void
  mark: (index: number) => void
  amount: (index: number) => void
  leave: (e: FocusEvent) => void
}

const TICK_WIDTH = 34

const AMOUNT_WIDTH = 84

const classes = (...names: (string | false | undefined)[]): string => names.filter((n) => n).join(' ')

function keepInSight(el: Element | undefined): void {
  const grid = el?.closest('.split-grid')
  if (!(el instanceof HTMLElement) || !(grid instanceof HTMLElement)) return
  const head = grid.querySelector<HTMLElement>('.split-cols')?.offsetHeight ?? 0
  const row = el.getBoundingClientRect()
  const room = grid.getBoundingClientRect()
  if (row.top < room.top + head) grid.scrollTop -= room.top + head - row.top
  else if (row.bottom > room.bottom) grid.scrollTop += row.bottom - room.bottom
}

function placed(el: Element | undefined): void {
  if (!(el instanceof HTMLElement)) return
  alignSuggestionsFrom(el)
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      if (el.isConnected) alignSuggestionsFrom(el)
    })
  }
}

// A column of numbers, or empty cells, aligns right.
function rightAligned(split: Split, rows: readonly unknown[]): boolean[] {
  return split.columns.map(
    (c) =>
      c.field === split.stockField ||
      rows.every((row) => {
        const t = splitColumnText(row, c)
        return t === '' || asNumber(t) !== null
      }),
  )
}

function gridStyle(columns: readonly SplitColumn[]): Record<string, string> {
  return {
    'grid-template-columns': [
      `${TICK_WIDTH}px`,
      ...columns.map((c) => (c.width === undefined ? 'minmax(64px, auto)' : `${c.width}px`)),
      `${AMOUNT_WIDTH}px`,
    ].join(' '),
  }
}

function headTpl(state: SplitState, name: string): TemplateResult {
  const total = state.total
  const rest = state.rest
  const head = [name, total === null ? '' : numberText(total, SPLIT_DECIMALS)].filter((t) => t !== '').join(' · ')
  return html`<div class="split-head">
      <span>${head}</span>
      ${rest === null ? nothing : html`<span class=${classes('split-rest', rest < 0 && 'over')}>noch zu verteilen<b>${numberText(rest, SPLIT_DECIMALS)}</b></span>`}
    </div>`
}

function rowTpl(
  state: SplitState,
  columns: readonly SplitColumn[],
  right: readonly boolean[],
  act: SplitAct,
  row: unknown,
  i: number,
): TemplateResult {
  const amount = state.amountOf(row)
  const on = amount !== undefined
  const marked = i === state.mark
  const typing = marked && state.editing
  return html`<div
          class=${classes('split-row', marked && 'marked', on && 'on')}
          role="option"
          aria-selected=${on ? 'true' : 'false'}
          ${ref((el) => {
            if (marked) keepInSight(el)
          })}
          @click=${() => act.mark(i)}
        >
          <div><span
            class=${classes('tick', on && 'on')}
            @click=${(e: Event) => {
              e.stopPropagation()
              act.toggle(i)
            }}
          ></span></div>
          ${columns.map((c, k) => {
            const text = splitColumnText(row, c)
            return html`<div class=${classes(right[k] && 'num', splitTone(c, text))}>${text}</div>`
          })}
          <div
            class=${classes('num', 'amount', typing && 'typing', state.wrong(row) && 'wrong')}
            @click=${(e: Event) => {
              e.stopPropagation()
              act.amount(i)
            }}
          >${amount ?? ''}${typing ? html`<span class="caret"></span>` : nothing}</div>
        </div>`
}

function keysTpl(amountTitle: string): TemplateResult {
  return html`<div class="split-keys" aria-hidden="true">
      <span><kbd>↑ ↓</kbd> Zeile</span>
      <span><kbd>Leertaste</kbd> Häkchen</span>
      <span><kbd>Zahl</kbd> ${amountTitle}</span>
      <span><kbd>Enter</kbd> fertig</span>
      <span><kbd>Esc</kbd> zurück</span>
    </div>`
}

export function splitListTpl(state: SplitState, amountTitle: string, act: SplitAct): TemplateResult | typeof nothing {
  const split = state.split
  if (split === null) return nothing
  const columns = split.columns
  const name = maskHost().source(split.sourceId)?.name ?? ''
  const right = rightAligned(split, state.rows)
  return html`<div
    class=${classes('split', state.blocked && 'blocked')}
    role="listbox"
    aria-multiselectable="true"
    aria-label=${name !== '' ? name : nothing}
    tabindex="0"
    data-ff-takes-keys
    ${ref(placed)}
    @keydown=${act.key}
    @focusout=${act.leave}
    @mousedown=${(e: MouseEvent) => {
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).focus()
    }}
  >
    ${headTpl(state, name)}
    ${state.loading ? html`<div class="split-wait">${name} lädt…</div>` : nothing}
    <div class="split-grid" style=${styleMap(gridStyle(columns))}>
      <div class="split-cols" role="presentation">
        <div></div>
        ${columns.map((c, i) => html`<div class=${right[i] ? 'num' : nothing}>${c.title}</div>`)}
        <div class="num">${amountTitle}</div>
      </div>
      ${state.rows.map((row, i) => rowTpl(state, columns, right, act, row, i))}
    </div>
    ${keysTpl(amountTitle)}
  </div>`
}
