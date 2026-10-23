import { css, html, nothing, type TemplateResult } from 'lit'
import { ref } from 'lit/directives/ref.js'
import { styleMap } from 'lit/directives/style-map.js'
import { asNumber, numberText } from '../../core/data/number'
import { maskState } from '../../runtime/maskState'
import { alignSuggestionsFrom } from '../lookup/suggestionList'
import { splitColumnText, splitTone, type SplitState } from './ledger/split'

interface SplitAct {
  key: (e: KeyboardEvent) => void
  toggle: (index: number) => void
  mark: (index: number) => void
  amount: (index: number) => void
  leave: (e: FocusEvent) => void
}

const TICK_WIDTH = 34

const AMOUNT_WIDTH = 84

const SHOWN_DECIMALS = 3

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

export function splitListTpl(state: SplitState, amountTitle: string, act: SplitAct): TemplateResult | typeof nothing {
  const split = state.split
  if (split === null) return nothing
  const columns = split.columns
  const name = maskState.host.source(split.sourceId)?.name ?? ''
  const total = state.total
  const rest = state.rest
  const right = columns.map((c) => c.field === split.stockField || state.rows.every((row) => {
    const t = splitColumnText(row, c)
    return t === '' || asNumber(t) !== null
  }))
  const grid = {
    'grid-template-columns': [
      `${TICK_WIDTH}px`,
      ...columns.map((c) => (c.width === undefined ? 'minmax(64px, auto)' : `${c.width}px`)),
      `${AMOUNT_WIDTH}px`,
    ].join(' '),
  }
  const head = [name, total === null ? '' : numberText(total, SHOWN_DECIMALS)].filter((t) => t !== '').join(' · ')
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
    <div class="split-head">
      <span>${head}</span>
      ${rest === null ? nothing : html`<span class=${classes('split-rest', rest < 0 && 'over')}>noch zu verteilen<b>${numberText(rest, SHOWN_DECIMALS)}</b></span>`}
    </div>
    ${state.loading ? html`<div class="split-wait">${name} lädt…</div>` : nothing}
    <div class="split-grid" style=${styleMap(grid)}>
      <div class="split-cols" role="presentation">
        <div></div>
        ${columns.map((c, i) => html`<div class=${right[i] ? 'num' : nothing}>${c.title}</div>`)}
        <div class="num">${amountTitle}</div>
      </div>
      ${state.rows.map((row, i) => {
        const amount = state.amountOf(row)
        const on = amount !== undefined
        const marked = i === state.mark
        const typing = marked && state.editing
        return html`<div
          class=${classes('split-row', marked && 'marked', on && 'on')}
          role="option"
          aria-selected=${on ? 'true' : 'false'}
          ${ref((el) => { if (marked) keepInSight(el) })}
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
      })}
    </div>
    <div class="split-keys" aria-hidden="true">
      <span><kbd>↑ ↓</kbd> Zeile</span>
      <span><kbd>Leertaste</kbd> Häkchen</span>
      <span><kbd>Zahl</kbd> ${amountTitle}</span>
      <span><kbd>Enter</kbd> fertig</span>
      <span><kbd>Esc</kbd> zurück</span>
    </div>
  </div>`
}

export const splitStyle = css`
      /* The list that spreads the amount of the capture row: hung from the
         cell of the amount like the suggestions, quiet (user, 21.10.). */
      .split {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 4;
        width: max-content;
        min-width: 360px;
        box-sizing: border-box;
        margin: 4px 0 0;
        background: var(--se-panel);
        border-radius: var(--se-radius-card);
        box-shadow: var(--se-shadow-drop);
        font-family: var(--se-font);
        font-size: var(--se-fs);
        font-weight: 400;
        color: var(--se-ink);
        text-align: left;
        white-space: nowrap;
        cursor: default;
        outline: none;
      }
      .split.leftward { left: auto; right: 0; }
      .cell-holder.upward .split { top: auto; bottom: 100%; margin: 0 0 4px; }

      .split-head {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding: 8px 12px 6px;
        font-size: var(--se-fs-sm);
        color: var(--se-ink-2);
      }
      .split-rest b { margin-left: 6px; font-weight: 600; color: var(--se-ink); }
      .split-wait { padding: 4px 12px 8px; color: var(--se-ink-2); }
      .split-rest.over b,
      .split.blocked .split-rest b { color: var(--se-danger); }

      .split-grid {
        display: grid;
        max-height: calc(28px * 8 + 22px);
        overflow: auto;
        scrollbar-width: thin;
      }
      .split-cols,
      .split-row {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
        align-items: center;
      }
      .split-cols {
        position: sticky;
        top: 0;
        z-index: 1;
        height: 22px;
        background: var(--se-panel);
        border-bottom: var(--se-border) solid var(--se-line-soft);
        font-size: var(--se-fs-xs);
        color: var(--se-faint);
      }
      .split-row { height: 28px; }
      .split-cols > div,
      .split-row > div {
        min-width: 0;
        height: 100%;
        display: flex;
        align-items: center;
        padding: 0 10px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .split-cols > div:first-child,
      .split-row > div:first-child { padding: 0 0 0 12px; }
      .split .num { justify-content: flex-end; font-variant-numeric: tabular-nums; }

      /* An unticked row is grey but its first value, so the eye finds it. */
      .split-row:not(.on) > div:nth-child(n + 3) { color: var(--se-faint); }
      .split-row.marked { background: var(--se-row-hover); box-shadow: var(--se-mark-bar); }
      .split .split-row > div.soon { color: var(--se-warning); }
      .split .split-row > div.past { color: var(--se-danger); }

      .split .amount.typing { box-shadow: var(--se-cell-focus); }
      .split .amount.wrong { box-shadow: var(--se-cell-held); color: var(--se-danger); }
      .split .caret {
        display: inline-block;
        width: 1px;
        height: 15px;
        margin-left: 1px;
        background: var(--se-ink);
      }

      .tick {
        display: inline-grid;
        place-items: center;
        width: 15px;
        height: 15px;
        box-sizing: border-box;
        background: var(--se-panel);
        border: var(--se-border) solid var(--se-box-line);
        border-radius: var(--se-radius-xs);
        cursor: pointer;
      }
      .tick.on { background: var(--se-accent); border-color: var(--se-accent); }
      .tick.on::after {
        content: '';
        width: 7px;
        height: 4px;
        border-left: 2px solid var(--se-panel);
        border-bottom: 2px solid var(--se-panel);
        transform: translateY(-1px) rotate(-45deg);
      }

      .split-keys {
        display: flex;
        gap: 14px;
        padding: 6px 12px 8px;
        font-size: var(--se-fs-xs);
        color: var(--se-faint);
      }
      .split-keys kbd { font: inherit; color: var(--se-ink-2); }
`
