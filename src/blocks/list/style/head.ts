import { css } from 'lit'
import { TABLE_PART_CSS } from '../parts'

const { head, headText } = TABLE_PART_CSS

// The sticky head: titles, the required star, the sort arrow and the handles
// that drag a column wider.
export const headStyle = css`
  .${head} {
    display: grid;
    min-height: var(--row-height);
    box-sizing: border-box;
  }

  .${head} {
    position: sticky;
    top: 0;
    z-index: 1;
    flex: none;
    background: var(--se-head-ground);
    border-bottom: var(--se-head-rule);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    color: var(--se-head-ink);
  }

  /* Two title lines fit exactly one tick: the page count takes the head for
     one row, anything taller would scroll the body. */
  .${head} > div {
    display: flex;
    align-items: center;
    line-height: calc((var(--tick) - var(--se-border)) / 2);
    white-space: normal;
    cursor: pointer;
    user-select: none;

    position: relative;
  }
  /* The star of a required column, as the reception mask marks its fields. */
  .${head} > div > .required {
    flex: none;
    margin-left: 3px;
    color: var(--se-danger);
    font-style: normal;
  }
  /* Breaks only between words; a word too long for the column is cut off. */
  .${head} .${headText} {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;
  }
  /* A narrow column: its head keeps its words whole by going smaller and
     tighter instead of being cut off. */
  .${head} > div { container-type: inline-size; }
  @container (max-width: 84px) {
    .${headText} { font-size: var(--se-fs-xs); }
  }

  /* A grid child of its own that hangs over the column line, which alone is
     too thin to grab; inside the head cell its overflow would clip it. */
  .width-handle {
    position: relative;
    z-index: 2;
    justify-self: end;
    width: 11px;
    margin-right: -5px;
    cursor: col-resize;

    /* Otherwise a finger scrolls the table instead of dragging. */
    touch-action: none;
  }
  .width-handle:hover {
    background: linear-gradient(
      to right,
      transparent 4px,
      var(--se-ink-2) 4px,
      var(--se-ink-2) 7px,
      transparent 7px
    );
  }

  .sort-arrow { font-size: var(--se-fs-xs); color: var(--se-ink-2); }
`
