import { css } from 'lit'

// The foot: the record count, the sums and the page buttons.
export const footStyle = css`
  .foot {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 36px;
    padding: 4px var(--se-cell-x);
    border-top: var(--se-border) solid var(--se-line-soft);
    font-size: var(--se-fs-sm);
    color: var(--se-ink-2);
    white-space: nowrap;
    overflow: hidden;
  }
  .page-info { flex: none; }
  .foot-right {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
  }
  .page-nav {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .totals {
    display: flex;
    align-items: baseline;
    gap: var(--se-gap-lg);
  }
  .total-title { color: var(--se-ink-2); font-weight: 700; }
  .totals b {
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .page-nav button {
    box-sizing: border-box;
    height: 26px;
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 700;
    padding: 0 8px;
    border: 0;
    border-radius: var(--se-radius-sm);
    background: var(--se-panel-2);
    color: var(--se-ink);
    cursor: pointer;
  }
  .page-nav button:hover:not(:disabled) { background: var(--se-hover); }
  .page-nav button:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }
  .page-nav button:disabled {
    opacity: 0.3;
    cursor: default;
  }
`
