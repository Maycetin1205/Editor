import { css, unsafeCSS } from 'lit'
import { AREA_COLUMNS, GRID, gridAreaCss } from '../../core/block/grid'
import { CARD_HEAD_PX } from '../area/areaStyle'

const PITCH = GRID.rowPx + GRID.gapPx
const ROOM = 12

// The Reiter: the card of a Bereich with a strip of titles as its head. The
// pages lie on top of each other in the body; only the open one shows. What
// room a page keeps around its blocks, it takes from --ff-tab-room.
export const tabsStyle = css`
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
  :host(:not([preview])) .frame { overflow: clip; }

  .appearance-box {
    background: var(--se-panel);
    box-shadow: var(--se-edge);
    --ff-tab-room: ${unsafeCSS(ROOM)}px;
  }
  .appearance-plain { --ff-tab-room: 0; }

  .strip {
    flex: none;
    box-sizing: border-box;
    height: ${unsafeCSS(CARD_HEAD_PX)}px;
    display: flex;
    align-items: stretch;
    gap: 2px;
    border-bottom: var(--se-hair);
    overflow: hidden;
  }
  .appearance-box .strip { margin: 0 ${unsafeCSS(ROOM)}px; }

  .tab,
  .add,
  .drop {
    appearance: none;
    flex: none;
    position: relative;
    display: inline-flex;
    align-items: center;
    margin: 0;
    border: 0;
    background: none;
    font: inherit;
    cursor: pointer;
    outline: none;
    transition: background var(--se-move), color var(--se-move);
  }
  .tab {
    max-width: 100%;
    padding: 0 10px;
    color: var(--se-ink-2);
    font-size: var(--se-fs-lg);
    font-weight: 600;
  }
  .tab:first-child { margin-left: -10px; }
  .tab:hover { color: var(--se-ink); background: var(--se-hover); }
  .tab.open { color: var(--se-accent); background: none; }
  .tab.open::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: calc(-1 * var(--se-border));
    height: 2px;
    background: var(--se-accent);
  }
  .tab:focus-visible { box-shadow: var(--se-focus-ring); }
  .title {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .add {
    justify-content: center;
    width: ${unsafeCSS(PITCH * 2)}px;
    color: var(--se-ink-2);
    border-radius: var(--se-radius-sm);
  }
  .add:hover { color: var(--se-ink); background: var(--se-hover); }
  .add .icon { width: 14px; height: 14px; }

  /* On the canvas, after the open title: takes the page away. */
  .drop {
    justify-content: center;
    width: ${unsafeCSS(PITCH)}px;
    margin-left: -8px;
    color: var(--se-faint);
    border-radius: var(--se-radius-sm);
  }
  .drop:hover { color: var(--se-danger); background: var(--se-hover); }
  .drop .icon { width: 12px; height: 12px; }

  .body {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  }
  ::slotted(*) { grid-area: 1 / 1; min-width: 0; min-height: 0; }
`

// A page: a grid of the columns of its Reiter, which the Reiter hands down
// in --area-columns.
export const tabStyle = css`
  :host { height: 100%; }

  .body {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    padding: var(--ff-tab-room, 0);
    ${unsafeCSS(gridAreaCss(`var(${AREA_COLUMNS}, ${GRID.columns})`))};
  }
  :host(:not([preview])) .body { overflow: clip; }

  .body slot { display: contents; }
`
