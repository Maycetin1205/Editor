import { css } from 'lit'

export const captureStyle = css`
      /* Anchor for the lookup window in the editor, which covers the whole block. */
      :host { position: relative; }

      /* The capture row sticks to the bottom of the scrolling list: otherwise
         the operator would type out of sight. */
      .body > .row.capture {
        position: sticky;
        bottom: 0;
        z-index: 1;
      }

      /* The capture row: on the soft accent with the accent bar at its left
         edge, its cells plain text; the cell with the cursor stands on a
         lower edge of the accent, across the whole column. */
      .row.capture,
      .body > .row.capture:hover {
        flex: none;
        background: var(--se-capture-ground);
        box-shadow: var(--se-capture-edge);
      }
      .row.capture > [role='cell']:focus-within { box-shadow: var(--se-cell-focus); }

      /* An emptied corrected row asks before it goes: red with the red bar
         like a booked row that asks (list/style/rowAsk.ts), the question
         from its left edge. Not the class asking, which would
         take the row out of its sticky place. */
      .row.capture.drop-asked,
      .body > .row.capture.drop-asked:hover {
        background: var(--se-danger-tint);
        box-shadow: var(--se-ask-bar);
      }
      .row.capture > .row-ask { left: 0; }

      /* A cell that holds the row back (its typed text names no record, or
         it is required and empty) stands on a red lower edge, also with the
         cursor, and its column says its name in red: the head, the name in
         the grey line, the quiet words of the empty cell. */
      .row.capture > [role='cell'].held,
      .row.capture > [role='cell'].held:focus-within { box-shadow: var(--se-cell-held); }
      .row.capture > .held .cell-input::placeholder,
      .row.capture > .sub.held > .head-text,
      .head > div.held .head-text { color: var(--se-danger); }

      .row.captured { flex: none; }
      :host(:not([preview])) .row.captured { cursor: pointer; }

      /* Anchor for the cross. */
      .row { position: relative; }

      /* One sign per row state, the tone: the reception mask tones a table
         row on hover the same way and shows no dot inside a row. A row on its
         way out is grey, not of the accent, which only the chosen row wears. */
      .row[data-status="captured"]:not(.selected),
      .row[data-status="writes"]:not(.selected) { background: var(--se-neutral-tint); }
      .row[data-status="changed"] { background: var(--se-warning-soft); }
      .row[data-status="error"] { background: var(--se-danger-soft); }
      .row[data-status="writes"] { animation: se-writing 1.1s ease-in-out infinite; }
      .row[data-status="written"] { color: var(--se-ink-2); }
      @keyframes se-writing { 50% { opacity: 0.55; } }
      @media (prefers-reduced-motion: reduce) {
        .row[data-status="writes"] { animation: none; }
      }

      /* Absolute, or the cross would push the value of the last cell aside. */
      .row-remove {
        position: absolute;
        right: 2px;
        top: 50%;
        transform: translateY(-50%);
        padding: 0 4px;
        font-family: var(--se-font);
        font-size: var(--se-fs-sm);
        line-height: 1;
        color: var(--se-faint);
        background: var(--se-panel);
        border: 0;
        border-radius: var(--se-radius-sm);
        cursor: pointer;
        opacity: 0;
      }
      .row:hover .row-remove,
      .row-remove:focus { opacity: 1; }
      .row-remove:hover { color: var(--se-danger); background: var(--se-danger-soft); }

      /* The chosen row is tinted at most, never framed. */
      .body > .row.selected,
      .body > .row:focus,
      .body > .row.selected:focus:not(:focus-visible) { outline: none; }

      /* A typable cell of the row hands its padding to its input, so the text
         keeps the edge of every other cell, and lets the suggestion list hang
         out. In the grey line the name keeps that edge. */
      .row > div.typable:not(.sub),
      .row.capture > [role='cell']:not(.sub) {
        display: flex;
        align-items: center;
        overflow: visible;
        padding: 0 calc(var(--se-cell-x) - var(--se-input-x) - var(--se-border));
      }
`
