import { css } from 'lit'
import { TABLE_PART_CSS } from '../list/parts'

const { table, plain, body, row, selected } = TABLE_PART_CSS

// The table as a plain list keeps the look the data list had before it ran
// on the table: no frame, larger type, a row of card height with the words
// 10 px in, the chosen row on the soft accent with the bar.
export const dataListStyle = css`
  :host { min-width: 0; height: 100%; }

  .list { height: 100%; }

  .${table}.${plain},
  :host-context(ff-area) .${table}.${plain},
  :host-context(ff-popup) .${table}.${plain},
  :host-context(ff-dialog) .${table}.${plain} {
    border: 0;
    border-radius: 0;
    font-size: var(--se-fs-lg);
  }

  .${plain} .${row} {
    height: auto;
    min-height: 44px;
  }
  .${plain} .${row}:has(.avatar) { min-height: 48px; }

  .${plain} .${row} > [role='cell'] {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
    line-height: inherit;
    white-space: normal;
  }

  .${plain} .${body} > .${row}:focus { outline: none; }
  .${plain} .${body} > .${row}:focus-visible {
    background: var(--se-panel);
    box-shadow: var(--se-focus-ring);
  }
  .${plain} .${body} > .${row}.${selected}:focus-visible { background: var(--se-selection); }

  /* Keine: the rows are only read. */
  .pick-none .${body} > .${row}:not([data-status]):hover { background: var(--se-panel); }

  /* .t1 and .t2: the name, the line under it. */
  .ident {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .name,
  .meta,
  .aside {
    display: block;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    font-weight: 700;
    line-height: 18px;
  }
  .meta {
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    line-height: 16px;
  }

  /* .meta of the sample: the short value on the right. */
  .aside {
    flex: none;
    max-width: 40%;
    color: var(--se-ink-2);
    font-size: var(--se-fs);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`
