import { css } from 'lit'

// A place of a column with more than one, and where a dragged card would
// land.
export const placeStyle = css`
  /* A place of a column with more than one: a white field on the column,
     its name small above the cards. The places share the height of the
     column: each keeps its cards and takes an equal part of what is left, so
     an empty place keeps its share instead of shrinking to a strip. */
  .place {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    border-radius: var(--se-radius);
    background: var(--se-place-ground);
    overflow: hidden;
  }

  .place-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px 4px;
  }
  .place-head .head-text {
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
  }

  .place-count {
    flex: none;
    margin-left: auto;
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* The addition of a place, beside its name. */
  .place-sub {
    min-width: 0;
    color: var(--se-faint);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* A place taken or free: the dot in the tone or grey, the word in a chip. */
  .place .dot { width: 7px; height: 7px; }
  .place.free .dot { background: var(--se-line-strong); }
  .state {
    flex: none;
    margin-left: auto;
    padding: 1px 8px;
    border-radius: var(--se-radius-card);
    font-size: var(--se-fs-xs);
    font-weight: 700;
  }
  .place.taken .state { background: var(--tone-soft); color: var(--tone-ink); }
  .place.free .state { background: var(--se-neutral-soft); color: var(--se-ink-2); }

  .place-body {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    gap: 8px;
    padding: 4px 8px 8px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  /* Where a dragged card would land. */
  .column.target .body,
  .place.target .place-body {
    background: color-mix(in oklab, var(--tone-strong) 8%, transparent);
    outline: 2px dashed var(--tone-strong);
    outline-offset: -2px;
  }
`
