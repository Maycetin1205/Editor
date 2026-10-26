import { css } from 'lit'

// The board as a whole: the summary above it, the message at its foot and
// the row of columns.
export const boardStyle = css`
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
`
