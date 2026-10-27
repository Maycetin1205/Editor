import { css, unsafeCSS } from 'lit'
import { rowsHigh } from '../../core/block/grid'

const BOX = rowsHigh(2)

export const fieldStyle = css`
  .field {
    position: relative;
    box-sizing: border-box;
    height: ${unsafeCSS(BOX)}px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: ${unsafeCSS(BOX)}px;
    align-content: start;
    font-family: var(--se-font);
    cursor: text;
  }
  .field.labelled {
    height: ${unsafeCSS(rowsHigh(3))}px;
    grid-template-rows: 14px ${unsafeCSS(BOX)}px;
    row-gap: 2px;
  }
  .field:hover .value { background: var(--se-hover); }
  .field:focus-within .value {
    background: var(--se-panel);
    border-color: var(--se-accent);
    box-shadow: var(--se-box-focus);
  }

  /* The label: plain, small, in the second ink. */
  .label {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 400;
    line-height: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The value and its control on one line, in the box of the field. A
     checkbox has its own box instead. */
  .value {
    grid-column: 2;
    grid-row: -2;
    box-sizing: border-box;
    height: ${unsafeCSS(BOX)}px;
    display: grid;
    grid-template: 1fr / minmax(0, 1fr);
    align-items: center;
    min-width: 0;
    padding: 0 10px;
    background: var(--se-panel);
    border: var(--se-border) solid var(--se-line-strong);
    border-bottom-color: var(--se-box-bottom);
    border-radius: var(--se-radius);
    transition: background-color var(--se-move);
  }
  .value > * { grid-area: 1 / 1; }
  /* Room for the sign of a choice, a date, a time and for the magnifier, and
     for the ring or the tick of a field that writes. */
  .kind-select .value,
  .kind-date .value,
  .kind-time .value,
  .kind-search .value,
  .field.noticed .value { padding-right: 32px; }
  .kind-search .ctrl::-webkit-search-cancel-button { display: none; }
  .kind-search .ctrl::placeholder { color: var(--se-placeholder); opacity: 1; }
  .field.lookup .value { padding-right: 36px; }

  .ctrl,
  .shown {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    height: 20px;
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 400;
    line-height: 20px;
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
  }
  .shown {
    display: block;
    white-space: nowrap;
    overflow: hidden;
  }
  .kind-number .ctrl,
  .kind-number .shown { text-align: right; }

  /* The chosen symbol on the left, beside the box. */
  .symbol {
    grid-column: 1;
    grid-row: -2;
    align-self: center;
    display: grid;
    margin-right: 10px;
    color: var(--se-faint);
  }
  .symbol .icon { width: 18px; height: 18px; }

  /* How the field is filled in, inside the box on the right; a click goes
     through to the control below. */
  .sign {
    grid-column: 2;
    grid-row: -2;
    align-self: center;
    justify-self: end;
    display: grid;
    margin-right: 10px;
    color: var(--se-faint);
    pointer-events: none;
  }
  .sign .icon { width: 16px; height: 16px; }

  /* A select lies invisible over the whole field. */
  select.ctrl {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    appearance: none;
  }

  input[type='number'] { appearance: textfield; }
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button { appearance: none; margin: 0; }

  /* The browser's own picker of a date or a time lies invisible over the sign
     on the right; the rest of the field takes the typing. */
  input::-webkit-datetime-edit,
  input::-webkit-datetime-edit-fields-wrapper,
  input::-webkit-datetime-edit-text,
  input::-webkit-datetime-edit-day-field,
  input::-webkit-datetime-edit-month-field,
  input::-webkit-datetime-edit-year-field,
  input::-webkit-datetime-edit-hour-field,
  input::-webkit-datetime-edit-minute-field { padding: 0; }
  input::-webkit-calendar-picker-indicator {
    position: absolute;
    top: 0;
    right: 0;
    width: 40px;
    height: 100%;
    margin: 0;
    padding: 0;
    opacity: 0;
    cursor: pointer;
  }

  /* An empty date stays empty instead of showing the browser's date pattern;
     while it is typed into, the pattern stands. */
  .value.empty input[type='date']:not(:focus)::-webkit-datetime-edit,
  .value.empty input[type='time']:not(:focus)::-webkit-datetime-edit { opacity: 0; }

  /* The lookup: its magnifier is a button inside the box on the right, its
     hits hang under the whole field. */
  .field .lookup { position: static; min-width: 0; }
  :host([data-ff-list]) { position: relative; z-index: 5; }

  .magnifier {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 32px;
    height: ${unsafeCSS(BOX - 4)}px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--se-radius-sm);
    background: none;
    color: var(--se-faint);
    cursor: pointer;
    transition: background-color var(--se-move), color var(--se-move);
  }
  .magnifier:hover { background: var(--se-hover-strong); color: var(--se-ink); }
  .field.noticed .magnifier { visibility: hidden; }
  .magnifier:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }
  .magnifier svg { width: 16px; height: 16px; }

  /* Mehrzeilig: the box as high as its lines (--lines, set by the field),
     the words wrap and scroll inside it; the box is not pulled by hand. The
     symbol stands at the first line. */
  .field.kind-multiline,
  .field.kind-multiline.labelled {
    --box: calc(var(--lines) * var(--se-fs) * var(--se-lh) + 12px + 2 * var(--se-border));
    height: auto;
    grid-template-rows: var(--box);
  }
  .field.kind-multiline.labelled { grid-template-rows: 14px var(--box); }
  .kind-multiline .value {
    height: var(--box);
    align-items: start;
    padding: 6px 10px;
  }
  .kind-multiline .ctrl,
  .kind-multiline .shown {
    height: 100%;
    line-height: var(--se-lh);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    text-overflow: clip;
  }
  textarea.ctrl {
    resize: none;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--se-scrollbar) transparent;
  }
  .kind-multiline .symbol { align-self: start; margin-top: 6px; }

  /* The checkbox: the box (tickBoxStyle) and its text in the middle of the
     field; with its label on the line of the boxes beside it. */
  .field.check {
    display: flex;
    align-items: center;
    cursor: default;
  }
  .field.check.labelled {
    align-items: flex-end;
    padding-bottom: 4px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .text {
    min-width: 0;
    color: var(--se-ink);
    font-size: var(--se-fs);
    font-weight: 400;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :host(:not([preview])) .text { cursor: pointer; user-select: none; }

  /* In the editor the controls take no clicks; the magnifier still opens the
     lookup window, the label takes the double click that renames it. */
  :host([preview]) .field { cursor: default; }
  :host([preview]) .ctrl { pointer-events: none; }
`
