import { css } from 'lit'

export const kanbanStyle = css`
  :host { position: relative; min-width: 0; height: 100%; display: flex; flex-direction: column; gap: 12px; }

  /* One pill a column above the board: its dot, its name, its count. */
  .summary {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    font-family: var(--se-font);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 28px;
    padding: 0 12px;
    border-radius: var(--se-radius-card);
    background: var(--se-card-bg);
    box-shadow: var(--se-edge);
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    white-space: nowrap;
  }
  .pill-count {
    color: var(--se-ink);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* What the column a card came to says: dark, at the foot on the left, for
     a moment. */
  .message {
    position: absolute;
    left: 12px;
    bottom: 12px;
    z-index: 2;
    max-width: calc(100% - 24px);
    padding: 8px 14px;
    border-radius: var(--se-radius-card);
    background: var(--se-ink);
    color: var(--se-card-bg);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 600;
    box-shadow: var(--se-shadow-lift);
    pointer-events: none;
    animation: message-in var(--se-move, .15s) ease-out;
  }
  @keyframes message-in {
    from { opacity: 0; transform: translateY(6px); }
  }

  .board {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow-x: auto;
    box-sizing: border-box;
  }

  .column {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-width: 232px;
    min-height: 0;
    overflow: hidden;
    background: var(--se-neutral-shell);
    border-radius: var(--se-radius-card);
    box-shadow: var(--se-column-edge);
    font-family: var(--se-font);
  }

  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 48px;
    padding: 0 16px;
  }

  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tone-strong);
  }

  .head-text {
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* .card .hd .cnt: the count in the second ink. */
  .count {
    color: var(--se-ink-2);
    font-size: var(--se-fs-lg);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* A line under the head that says what the column holds. */
  .sub {
    flex: none;
    margin: -6px 16px 10px;
    color: var(--tone-ink);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* An empty column or place: its words in a dashed frame. */
  .empty {
    flex: none;
    display: grid;
    place-items: center;
    min-height: 64px;
    padding: 8px 12px;
    box-sizing: border-box;
    border: 1px dashed var(--se-line-strong);
    border-radius: var(--se-radius);
    color: var(--se-faint);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    text-align: center;
  }

  .body {
    padding: 0 10px 10px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  /* A place of a column with more than one: a room on the column, white,
     its name small above the cards. The places share the height of the
     column: each keeps its cards and takes an equal part of what is left, so
     an empty room is a room, not a strip. */
  .place {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    border-radius: var(--se-radius);
    background: var(--se-place-ground);
    overflow: hidden;
  }

  .place-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px 4px;
  }
  .place-head .head-text {
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
  }

  .place-count {
    flex: none;
    margin-left: auto;
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* Who works in a room, beside its name. */
  .place-sub {
    min-width: 0;
    color: var(--se-faint);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* A room taken or free: the dot in the tone or grey, the word in a chip. */
  .place .dot { width: 7px; height: 7px; }
  .place.free .dot { background: var(--se-line-strong); }
  .state {
    flex: none;
    margin-left: auto;
    padding: 1px 8px;
    border-radius: var(--se-radius-card);
    font-size: var(--se-fs-xs);
    font-weight: 700;
  }
  .place.taken .state { background: var(--tone-soft); color: var(--tone-ink); }
  .place.free .state { background: var(--se-neutral-soft); color: var(--se-ink-2); }

  .place-body {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    gap: 8px;
    padding: 4px 8px 8px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  /* Where a dragged card would land. */
  .column.target .body,
  .place.target .place-body {
    background: color-mix(in oklab, var(--tone-strong) 8%, transparent);
    outline: 2px dashed var(--tone-strong);
    outline-offset: -2px;
  }

  .card {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--se-card-bg);
    border-radius: var(--se-radius);
    box-shadow: var(--se-shadow-tile);
    font-family: var(--se-font);
    transition: box-shadow var(--se-move), background-color var(--se-move);
  }

  /* As a row of every list: a ground under the pointer, chosen the soft
     accent with the accent bar at the left edge. */
  .card:hover {
    background: var(--se-row-hover);
    box-shadow: var(--se-shadow-tile-hover);
  }

  .card.chosen {
    background: var(--se-selection);
    box-shadow: var(--se-shadow-chosen);
  }

  /* The card being dragged rises from its column. */
  .card.dragging {
    z-index: 1;
    box-shadow: var(--se-shadow-lift);
  }

  /* The avatar beside name and subline. */
  .main {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }

  .ident {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* Name and subline on one line. */
  .line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  .name,
  .owner {
    display: block;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-weight: 700;
  }
  .meta {
    flex: none;
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
  }
  .owner {
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 600;
  }

  /* The upper right corner: time, wait, amount or a word, as a chip in the
     tone of the column. */
  .corner {
    flex: none;
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    border-radius: var(--se-radius);
    background: var(--tone-soft);
    color: var(--tone-ink);
    font-size: var(--se-fs-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* The foot of a card under a line: what it says on the left, the choice
     of a place and the button on the right. */
  .foot {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding-top: 8px;
    border-top: 1px solid var(--se-line-soft);
  }
  .foot-text {
    flex: 1;
    min-width: 0;
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .foot .advance {
    flex: none;
    width: auto;
    max-width: 60%;
    height: 28px;
    padding: 0 12px;
    font-size: var(--se-fs-sm);
  }
  .pick {
    flex: none;
    max-width: 55%;
    height: 28px;
    padding: 0 6px;
    border: none;
    border-radius: var(--se-radius);
    background: var(--se-neutral-soft);
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    cursor: pointer;
  }
  .pick:hover:not(:disabled) { background: color-mix(in oklab, var(--se-neutral-soft), var(--se-neutral) 9%); }
  .pick:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }
  .pick:disabled { cursor: default; color: var(--se-ink-2); }

  .text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    color: var(--se-ink-2);
    font-size: var(--se-fs);
    font-weight: 600;
    line-height: var(--se-lh);
  }

  /* The line of information under the text. */
  .date {
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* How far the time lies from now; past it, red. */
  .until {
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
  }
  .until.late { color: var(--se-danger); }

  /* The line before each hour of a column by the clock. */
  .hour {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 4px 0;
    color: var(--se-ink-2);
    font-family: var(--se-font);
    font-size: var(--se-fs-xs);
    font-weight: 700;
  }
  .hour::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--se-line);
  }

  /* The line of now. */
  .now {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 1px 4px;
    color: var(--se-danger);
    font-family: var(--se-font);
    font-size: var(--se-fs-xs);
    font-weight: 700;
  }
  .now::before {
    content: '';
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--se-danger);
  }
  .now::after {
    content: '';
    flex: 1;
    height: 2px;
    background: var(--se-danger);
  }

  /* The button under the card, a second button (Chat 5e): the grey ground
     of the day button Heute without a line, the first ink half bold; a step
     darker under the pointer. The lighter --se-panel-2 would vanish on a
     card under the pointer. Neither the tone of a column nor the accent:
     only the main button is blue. */
  .advance {
    box-sizing: border-box;
    width: 100%;
    height: 32px;
    border: none;
    border-radius: var(--se-radius);
    background: var(--se-neutral-soft);
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    transition: background-color var(--se-move);
  }
  .advance:hover { background: color-mix(in oklab, var(--se-neutral-soft), var(--se-neutral) 9%); }
  .advance:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }

  :host([preview]) .advance:empty::before {
    content: '—';
    color: var(--se-faint);
  }
`
