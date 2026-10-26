import { css } from 'lit'

// A card: its main line with avatar and corner, its text, its foot with
// the choice of a place and the button.
export const cardStyle = css`
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
  .heading2 {
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
  .heading2 {
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

  /* The button under the card, a second button: the grey ground of the day
     button Heute without a line, the first ink half bold; a step darker under
     the pointer. The lighter --se-panel-2 would vanish on a card under the
     pointer. Neither the tone of a column nor the accent: only the main
     button is blue. */
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
