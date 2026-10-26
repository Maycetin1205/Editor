import { css } from 'lit'

// The small window that shows or hides columns.
export const columnPickerStyle = css`
  /* The picker lies inside the table, which clips whatever hangs out. */
  .picker-backdrop {
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    z-index: 4;
  }
  .column-picker {
    position: absolute;
    z-index: 5;
    display: flex;
    flex-direction: column;
    min-width: 160px;
    max-width: 260px;
    max-height: 70%;
    overflow-y: auto;
    padding: 6px;
    background: var(--se-panel);
    border-radius: var(--se-radius);
    box-shadow: var(--se-shadow-pop);
  }
  .picker-title {
    margin: 0;
    padding: 3px 8px 5px;
    font-size: var(--se-fs-sm);
    font-weight: 600;
    color: var(--se-ink-2);
  }
  .picker-row,
  .picker-all {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 7px 9px;
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 600;
    text-align: left;
    color: var(--se-ink);
    background: none;
    border: 0;
    border-radius: var(--se-radius-sm);
    cursor: pointer;
  }
  .picker-row:hover:not(:disabled),
  .picker-all:hover { background: var(--se-hover); }
  .picker-row:disabled { cursor: default; opacity: 0.55; }
  .picker-row:not(.checked) { color: var(--se-ink-2); }
  .picker-check {
    flex: none;
    width: 12px;
    color: var(--se-ink);
  }
  .picker-all {
    margin-top: 3px;
    padding-top: 6px;
    border-top: var(--se-border) solid var(--se-line-soft);
    color: var(--se-ink);
    font-weight: 700;
  }
`
