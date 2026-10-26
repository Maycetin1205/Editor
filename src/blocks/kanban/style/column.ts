import { css } from 'lit'

// A column: its head, its body, the frame of an empty one and the lines of
// a column by the clock.
export const columnStyle = css`
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

  /* The count in the second ink. */
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
`
