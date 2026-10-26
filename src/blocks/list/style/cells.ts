import { css } from 'lit'

// The cells of head and rows, and the grey line under a record.
export const cellsStyle = css`
  .head > div,
  .row > div {
    padding: 0 var(--se-cell-x);
    line-height: calc(var(--row-height) - 1px);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row > div { color: var(--se-ink); }

  /* A column that stands right, with its sum: the figures line up. */
  .row > div.right {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .head > div.right { justify-content: flex-end; text-align: right; }

  /* A record with a grey line is two lines high: the row on top and,
     under a cell of it, the column anchored there, as wide as the cell.
     It hangs right under the line above, so both read as one record, and
     is grey: its value in the second ink, its name the head of its column
     and looking like one, small on the baseline of the value.
     A record without a value there stays one line high. */
  .row.subline {
    height: calc(var(--row-height) + var(--sub-height));
    grid-template-rows: calc(var(--row-height) - var(--se-border)) var(--sub-height);
  }
  .row.subline > [role='cell']:not(.sub) { grid-row: 1; }
  .row > .sub {
    grid-row: 2;
    display: flex;
    align-items: baseline;
    gap: var(--se-gap);
    line-height: calc(var(--sub-height) - 4px);
    font-size: var(--se-fs-sm);
  }
  .row > .sub.right { justify-content: flex-end; }
  .sub > .head-text {
    flex: none;
    font-size: var(--se-fs-xs);
    font-weight: 600;
    color: var(--se-head-ink);
  }
  .row > .sub > .sub-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--se-ink-2);
  }

  /* A cell of the grey line that takes typing lets the suggestion list
     hang out; its input is as small as the line. */
  .row > .sub.typable { overflow: visible; }
  .sub > .cell-holder { flex: 1 1 0; }
  .sub .cell-input {
    height: calc(var(--sub-height) - 4px);
    font-size: var(--se-fs-sm);
  }

  /* Only dimmed in the editor: it is a real column the builder still edits. */
  :host([preview]) .hidden { opacity: 0.45; }
`
