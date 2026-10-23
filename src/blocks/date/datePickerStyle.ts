import { css } from 'lit'

export const dateStyle = css`
  .picker {
    --picker-height: 36px;
    display: flex;
    align-items: stretch;
    gap: var(--se-gap);
    height: var(--picker-height);
    font-family: var(--se-font);
  }

  .stepper {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    height: 100%;
    padding: 2px;
    border-radius: var(--se-radius);
    background: var(--se-neutral-soft);
    transition: background-color var(--se-move);
  }
  .stepper:focus-within {
    background: var(--se-panel);
    box-shadow: var(--se-focus-ring);
  }

  .arrow {
    flex: none;
    display: grid;
    place-items: center;
    width: 28px;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: var(--se-radius-sm);
    background: transparent;
    color: var(--se-ink-2);
    cursor: pointer;
    transition: background-color var(--se-move);
  }
  .arrow:hover { background: var(--se-panel); }
  .arrow .icon { width: 16px; height: 16px; }

  /* The day stands whole, as wide as the browser writes it: 21.10.2026 on a
     German Windows. */
  .field {
    box-sizing: border-box;
    flex: 1 0 auto;
    height: 100%;
    border: none;
    background: transparent;
    padding: 0 4px;
    font-family: var(--se-font);
    font-size: var(--se-fs-lg);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--se-ink);
    text-align: center;
  }
  .field:focus { outline: none; }
  .field::-webkit-calendar-picker-indicator { opacity: .5; cursor: pointer; }
  .field::-webkit-calendar-picker-indicator:hover { opacity: .9; }

  .today {
    box-sizing: border-box;
    flex: none;
    height: 100%;
    padding: 0 14px;
    border: none;
    border-radius: var(--se-radius);
    background: var(--se-neutral-soft);
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color var(--se-move);
  }
  .today:hover { background: color-mix(in oklab, var(--se-neutral-soft), var(--se-neutral) 9%); }

  .arrow:focus-visible,
  .today:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }

  /* In a narrow block the day button goes, the day stays whole. */
  :host { container-type: inline-size; }
  @container (max-width: 274px) {
    .today { display: none; }
  }

  :host([preview]) .field,
  :host([preview]) .arrow,
  :host([preview]) .today { pointer-events: none; }

  :host([fills]) .picker { height: 100%; }
`
