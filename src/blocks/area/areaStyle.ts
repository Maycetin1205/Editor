import { css, unsafeCSS } from 'lit'
import { AREA_COLUMNS, GRID, gridAreaCss } from '../../core/block/grid'

const PITCH = GRID.rowPx + GRID.gapPx
const ROOM = 12
const HEAD = 3 * PITCH - ROOM
const SIDE = 16

export const CARD_HEAD_PX = HEAD
const BOX_ROOM = PITCH / 2

export const areaStyle = css`
  :host { display: block; height: 100%; }

  .frame {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: var(--se-radius-card);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
  }

  /* In the mask the area cuts what reaches over its edge; clip, not hidden:
     the box does not scroll even when a field outside of it takes the focus.
     On the canvas it does not cut: the editor draws the selection and the
     grips of a block over the block's edge, and at the edge of the area the
     cut would take them away. */
  :host(:not([preview])) .frame,
  :host(:not([preview])) .body { overflow: clip; }

  /* The card: white on the ground, the hairline drawn inside, so the card
     keeps the size of its room. */
  .appearance-box,
  .appearance-headed,
  .appearance-fold,
  .appearance-band {
    background: var(--se-panel);
    box-shadow: var(--se-edge);
  }
  .appearance-box .body { padding: ${unsafeCSS(BOX_ROOM)}px ${unsafeCSS(SIDE)}px; }
  .appearance-headed .body,
  .appearance-fold .body { padding: 0 ${unsafeCSS(SIDE)}px ${unsafeCSS(ROOM)}px; }

  /* Band: the card at the top of the sheet, its texts in the middle of their
     rows. The columns inside stay those of the sheet. */
  .appearance-band { --se-text-justify: center; }
  .appearance-band .body { padding: 0 ${unsafeCSS(SIDE)}px; }

  /* The head: the title 14 px semibold in the accent over a hairline, both
     within the room beside the blocks. */
  .head {
    flex: none;
    box-sizing: border-box;
    height: ${unsafeCSS(HEAD)}px;
    display: flex;
    align-items: center;
    gap: var(--se-gap);
    margin: 0 ${unsafeCSS(SIDE)}px;
    border-bottom: var(--se-hair);
    color: var(--se-accent);
    font-size: var(--se-fs-lg);
    font-weight: 600;
  }

  .head-text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Klappbar: the caret before the title points down while open and to the
     right while folded, as in the head of a SoftEngine block. The whole head
     takes the click; folded, the card is the head alone. */
  .caret {
    flex: none;
    display: inline-flex;
    margin-left: -2px;
    opacity: .75;
    transition: transform var(--se-move), opacity var(--se-move);
  }
  .caret .icon { width: 14px; height: 14px; }
  .shut .caret { transform: rotate(-90deg); }
  .head[role='button'] { cursor: pointer; user-select: none; outline: none; }
  .head[role='button']:hover .caret,
  .head[role='button']:focus-visible .caret { opacity: 1; }
  .head[role='button']:focus-visible { box-shadow: var(--se-cell-focus); }
  .shut .head { height: 100%; border-bottom-color: transparent; }
  .body[hidden] { display: none; }

  .start-note {
    margin-left: auto;
    flex: none;
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 400;
  }

  .body {
    box-sizing: border-box;
    flex: 1 1 auto;
    min-height: 0;
    ${unsafeCSS(gridAreaCss(`var(${AREA_COLUMNS}, ${GRID.columns})`))};
  }

  .body slot { display: contents; }
`
