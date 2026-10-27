import { css } from 'lit'

// The search line above the head, and the marks it leaves on the hits.
export const searchStyle = css`
  .search-row {
    padding: 8px var(--se-cell-x);
    border-bottom: var(--se-border) solid var(--se-line-soft);
  }
  /* The magnifier stands in the field, left of the text. */
  .search {
    position: relative;
    display: flex;
    align-items: center;
    max-width: 440px;
  }
  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    color: var(--se-faint);
    pointer-events: none;
  }
  .search-icon svg { width: 16px; height: 16px; }
  /* The search keeps its ground, as the typing line of the sample (.cell);
     the text starts 8px after the magnifier. */
  .search-row input {
    box-sizing: border-box;

    width: 100%;
    height: 32px;
    padding: 0 10px 0 34px;
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 400;
    line-height: var(--se-lh);
    color: var(--se-ink);
    background: var(--se-panel-2);
    border: 0;
    border-radius: var(--se-radius);
    transition: background-color var(--se-move);
  }
  .search-row input:hover { background: var(--se-hover); }
  .search-row input:focus {
    outline: none;
    background: var(--se-panel);
    box-shadow: var(--se-focus-ring);
  }

  mark {
    padding: 0 1px;
    color: inherit;
    background: var(--se-warning-soft);
    border-radius: var(--se-radius-sm);
  }
`
