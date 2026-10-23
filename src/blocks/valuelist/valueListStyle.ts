import { css } from 'lit'

export const valueListStyle = css`
  .values {
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    line-height: var(--se-lh);
    font-variant-numeric: tabular-nums;
  }
  .lines {
    display: table;
    width: 100%;
    border-collapse: collapse;
  }
  .lines > .line { display: table-row; }
  .lines > .line > * {
    display: table-cell;
    padding-top: var(--se-gap-sm);
  }
  .lines > .line:first-child > * { padding-top: 0; }
  .label {
    color: var(--se-ink-2);
  }
  .lines .label {
    width: 1%;
    padding-right: 24px;
    white-space: nowrap;
  }
  .value {
    text-align: left;
    overflow-wrap: anywhere;
  }
  .value.numbers {
    text-align: right;
    white-space: nowrap;
  }
  .sum {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    column-gap: 24px;
    padding-top: 10px;
    border-top: var(--se-border) solid var(--se-line-strong);
  }
  .sum:not(:first-child) { margin-top: calc(var(--se-gap-sm) + var(--se-gap)); }
  .sum + .lines { margin-top: var(--se-gap-sm); }
  .sum .value {
    color: var(--se-accent);
    font-size: var(--se-fs-xl);
    font-weight: 600;
  }

  /* A line with a chain of its own: the caret at its end says so; in the mask
     the line answers the pointer and the keyboard. */
  .go {
    color: var(--se-ink-2);
    opacity: .55;
    line-height: 0;
    transition: opacity var(--se-move), color var(--se-move);
  }
  .go .icon { width: 12px; height: 12px; }
  .lines > .line > .go {
    width: 1%;
    padding-left: var(--se-gap-sm);
    vertical-align: middle;
  }
  .sum > .value { margin-left: auto; }
  .sum > .go { align-self: center; margin-left: calc(var(--se-gap-sm) - 24px); }
  .link[role='button'] { cursor: pointer; outline: none; }
  .line.link[role='button']:hover > *,
  .line.link[role='button']:focus-visible > *,
  .sum.link[role='button']:hover,
  .sum.link[role='button']:focus-visible { background: var(--se-row-hover); }
  .link[role='button']:hover .value,
  .link[role='button']:focus-visible .value { color: var(--se-accent); }
  .link[role='button']:hover .go,
  .link[role='button']:focus-visible .go { color: var(--se-accent); opacity: 1; }
  .link[role='button']:focus-visible .label { box-shadow: var(--se-mark-bar); }
  .link[role='button']:active .value { color: var(--se-accent-dark); }
`
