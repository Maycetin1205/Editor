import { css } from 'lit'

// A row that asks before it goes, and a row whose deletion is on its way.
export const rowAskStyle = css`
  /* Red with the red bar, the small window under it, above it where the
     list ends. Löschen is the red button, the choice the keys stand on
     carries the ring. The row stands above the capture row, which sticks to
     the bottom of the list one layer up; under the last record the window
     would hide behind it. */
  .row.asking,
  .body > .row.asking:hover,
  .body > .row.asking:focus-visible {
    position: relative;
    z-index: 2;
    background: var(--se-danger-tint);
    box-shadow: var(--se-ask-bar);
  }
  .row-ask {
    position: absolute;
    z-index: 1;
    top: calc(100% + 2px);
    display: flex;
    gap: var(--se-gap-sm);
    padding: 4px;
    background: var(--se-panel);
    border-radius: var(--se-radius-xs);
    box-shadow: var(--se-ask-edge);
  }
  .row.ask-above > .row-ask { top: auto; bottom: calc(100% + 2px); }
  .row-ask > button {
    height: 24px;
    padding: 0 10px;
    border-radius: var(--se-radius-xs);
    font: inherit;
    font-size: var(--se-fs);
    line-height: 1;
    cursor: pointer;
    outline: none;
  }
  .row-ask > .ask-drop {
    border: 0;
    background: var(--se-danger);
    color: var(--se-panel);
    font-weight: 600;
  }
  .row-ask > .ask-keep {
    border: var(--se-border) solid var(--se-line-strong);
    background: var(--se-panel);
    color: var(--se-ink);
  }
  .row-ask > button:focus { box-shadow: var(--se-ask-ring); }

  /* Struck through and faint, its note over the last column, until
     SoftEngine hands the rows over anew. */
  .row.dropping { position: relative; }
  .row.dropping > [role='cell'] {
    color: var(--se-faint);
    text-decoration: line-through;
  }
  .drop-note {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    padding: 0 var(--se-cell-x);
    background: inherit;
    font-size: var(--se-fs-sm);
    color: var(--se-ink-2);
  }
`
