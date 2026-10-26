import { css } from 'lit'
import { TABLE_PART_CSS } from '../parts'

const { body, row, ruler, selected } = TABLE_PART_CSS

// The scrolling body and its rows: hover, focus and the chosen row.
export const rowsStyle = css`
  .${row} {
    display: grid;
    height: var(--row-height);
    box-sizing: border-box;
  }

  .${body} {
    flex: 1 1 auto;
    overflow: auto;

    /* No reserved gutter: in a short list it would stand as a gap beside
       the last column. */
    scrollbar-width: thin;
    display: flex;
    flex-direction: column;
  }

  .${body} > .${row} { flex: none; }

  /* The room under the records holds empty rows down to the foot, as a
     ledger keeps its lines where no entry is yet. */
  .${ruler} {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }

  .${row} {
    border-bottom: var(--se-border) solid var(--se-line-soft);
    background: var(--se-panel);
    transition: background-color var(--se-move);
  }

  /* A row under the pointer lifts from the sheet. Only a row without a
     status does: the status color is the message. */
  .${body} > .${row}:not([data-status]):hover {
    background: var(--se-row-hover);
  }

  .${body} > .${row}.selectable { cursor: pointer; }

  .${body}:focus { outline: none; }
  .${body} > .${row}:focus {
    outline: var(--se-border) solid var(--se-accent);
    outline-offset: calc(-1 * var(--se-border));
  }
  .${body} > .${row}:focus:not(:focus-visible) { outline: none; }

  .${row}.${selected},
  .${row}:focus-visible,
  .${body} > .${row}.${selected}:not([data-status]):hover,
  .${body} > .${row}:not([data-status]):focus-visible:hover {
    background: var(--se-selection);
  }
  /* The chosen row, as in every list of the mask: the soft accent with
     the accent bar at its left edge; its words keep their ink. */
  .${row}.${selected} { box-shadow: var(--se-mark-bar); }
`
