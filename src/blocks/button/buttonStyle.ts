import { css, unsafeCSS } from 'lit'
import { rowsHigh } from '../../core/block/grid'

export const buttonStyle = css`
  button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--se-gap);
    width: 100%;
    height: ${unsafeCSS(rowsHigh(2))}px;
    padding: 0 16px;
    cursor: pointer;
    border-radius: var(--se-radius);
    border: var(--se-border) solid var(--look-edge);
    background: var(--look-ground);
    color: var(--look-ink);
    font-family: var(--se-font);
    font-size: var(--look-fs);
    font-weight: 400;
    line-height: 1;
    white-space: nowrap;

    transition: background-color var(--se-move), border-color var(--se-move), color var(--se-move);
  }
  button.emphasis-solid { font-weight: 600; --notice-ink: var(--look-ink); }
  button.size-small { padding: 0 10px; }
  button.size-large {
    height: ${unsafeCSS(rowsHigh(3))}px;
    padding: 0 18px;
  }

  button:hover:enabled { background: var(--look-ground-hover); border-color: var(--look-edge-hover); }

  /* While it writes the button keeps its ground and takes no click. */
  button:disabled { cursor: default; }

  /* One line; a label wider than the button ends in an ellipsis. */
  .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: var(--se-lh);
  }

  /* The keyboard on the button: a ring of the ink around it, which shows on
     a full ground as well. */
  button:focus-visible { outline: 2px solid var(--se-ink); outline-offset: 1px; }
`
