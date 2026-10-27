import { css, unsafeCSS } from 'lit'
import { AREA_COLUMNS, GRID, gridAreaCss } from '../../core/block/grid'

// The head of a card: 36 px, the compact measure (user, 26.10.: compact is
// the only density). The dialog frame takes the same height for its head.
export const CARD_HEAD_PX = 36

// Set on the blocks around a field whose suggestion list is open.
export const LIST_INSIDE_ATTR = 'data-ff-list-inside'
const LIST_INSIDE = unsafeCSS(`[${LIST_INSIDE_ATTR}]`)

export const areaStyle = css`
  :host { display: block; height: 100%; }

  .area {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    font-family: var(--se-font);
    font-size: var(--se-fs);
    line-height: var(--se-lh);
    color: var(--se-ink);
  }

  /* In the mask the area cuts what reaches over its edge; clip, not hidden:
     the box does not scroll even when a field outside of it takes the focus.
     On the canvas it does not cut: the editor draws the selection and the
     grips of a block over the block's edge, and at the edge of the area the
     cut would take them away. */
  :host(:not([preview])) .area,
  :host(:not([preview])) .body { overflow: clip; }

  /* A suggestion list open inside reaches over the edge and over the areas
     below; the area lets it through for as long as it is open. */
  :host(${LIST_INSIDE}) { position: relative; z-index: 6; }
  :host(${LIST_INSIDE}) .area,
  :host(${LIST_INSIDE}) .body { overflow: visible; }

  /* The card: white on the ground, the hairline drawn inside so the card
     keeps the size of its room, no shadow: a shadow is for what floats over
     the mask. */
  .kind-card,
  .kind-headed {
    background: var(--se-panel);
    border-radius: var(--se-radius-card);
    box-shadow: var(--se-edge);
  }

  /* The head: the title in the ink, the extra at the right edge, a hairline
     under both. 36 px high, compact, the one measure of the mask. */
  .head {
    flex: none;
    box-sizing: border-box;
    height: ${CARD_HEAD_PX}px;
    display: flex;
    align-items: center;
    gap: var(--se-gap);
    padding: 0 8px 0 12px;
    border-bottom: var(--se-hair);
  }
  .shut .head { border-bottom-color: transparent; }

  /* Klappbar: the chevron before the title, a button of its own; folded it
     points to the right, and the card is the head alone. */
  .fold {
    flex: none;
    width: 24px;
    height: 24px;
    margin-left: -6px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--se-radius);
    background: transparent;
    color: var(--se-ink-2);
    cursor: pointer;
    transition: background-color var(--se-move), color var(--se-move);
  }
  .fold:hover { background: var(--se-panel-2); color: var(--se-ink); }
  .fold:disabled { cursor: default; }
  .fold:focus-visible { outline: 2px solid var(--se-accent); outline-offset: 1px; }
  .fold .icon {
    width: 14px;
    height: 14px;
    transition: transform var(--se-fold);
  }
  .shut .fold .icon { transform: rotate(-90deg); }

  .title {
    min-width: 0;
    font-size: var(--se-fs-lg);
    font-weight: 600;
    color: var(--se-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The extra at the right: a value or a text in the second ink, a count as
     a chip. */
  .meta {
    margin-left: auto;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: var(--se-radius-chip);
    background: var(--se-panel-2);
    box-shadow: var(--se-edge);
    color: var(--se-ink-2);
    font-weight: 600;
  }

  /* The body: the grid of the blocks inside, 12 px in from the card, none in
     a free area. */
  .body {
    box-sizing: border-box;
    flex: 1 1 auto;
    min-height: 0;
    padding: 12px;
    ${unsafeCSS(gridAreaCss(`var(${AREA_COLUMNS}, ${GRID.columns})`))};
  }
  .kind-plain .body { padding: 0; }
  .body[hidden] { display: none; }
  .body slot { display: contents; }

  /* Without rows the body is no grid: the empty state stands in its middle,
     the error row at its top. */
  .body.state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
  }
  .body.failed { justify-content: flex-start; }

  /* Leer: a sign, a sentence, a hint and a button, in the middle, still. */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    text-align: center;
    color: var(--se-ink-2);
  }
  .empty .icon {
    width: 28px;
    height: 28px;
    margin-bottom: 4px;
    color: var(--se-faint);
  }
  .empty-title { font-weight: 600; }
  .empty-hint { font-size: var(--se-fs-sm); color: var(--se-faint); }
  .empty .btn { margin-top: 8px; }

  .btn {
    height: 28px;
    padding: 0 10px;
    border: var(--se-border) solid var(--se-line-strong);
    border-radius: var(--se-radius);
    background: var(--se-panel);
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color var(--se-move);
  }
  .btn:hover { background: var(--se-panel-2); }
  .btn:focus-visible { outline: 2px solid var(--se-accent); outline-offset: 2px; }

  /* Fehler: one row at the top of the body, the red tint with the red hairline,
     the sign, the reason, the button that loads anew. */
  .alert {
    display: flex;
    align-items: center;
    gap: var(--se-gap-lg);
    min-height: 36px;
    padding: 6px 12px;
    border-radius: var(--se-radius);
    background: var(--se-danger-soft);
    box-shadow: var(--se-alert-edge);
  }
  .alert .icon {
    flex: none;
    width: 16px;
    height: 16px;
    color: var(--se-danger);
  }
  .alert-text { flex: 1; min-width: 0; }
  .alert-text b { font-weight: 600; }

  @media (prefers-reduced-motion: reduce) {
    .fold .icon,
    .fold,
    .btn { transition: none; }
  }
`
