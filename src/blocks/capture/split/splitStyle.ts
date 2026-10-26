import { css } from 'lit'

export const splitStyle = css`
      /* The list that spreads the amount of the capture row hangs from the
         cell of the amount like the suggestions, and as quiet. */
      .split {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 4;
        width: max-content;
        min-width: 360px;
        box-sizing: border-box;
        margin: 4px 0 0;
        background: var(--se-panel);
        border-radius: var(--se-radius-card);
        box-shadow: var(--se-shadow-drop);
        font-family: var(--se-font);
        font-size: var(--se-fs);
        font-weight: 400;
        color: var(--se-ink);
        text-align: left;
        white-space: nowrap;
        cursor: default;
        outline: none;
      }
      .split.leftward { left: auto; right: 0; }
      .cell-holder.upward .split { top: auto; bottom: 100%; margin: 0 0 4px; }

      .split-head {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding: 8px 12px 6px;
        font-size: var(--se-fs-sm);
        color: var(--se-ink-2);
      }
      .split-rest b { margin-left: 6px; font-weight: 600; color: var(--se-ink); }
      .split-wait { padding: 4px 12px 8px; color: var(--se-ink-2); }
      .split-rest.over b,
      .split.blocked .split-rest b { color: var(--se-danger); }

      .split-grid {
        display: grid;
        max-height: calc(28px * 8 + 22px);
        overflow: auto;
        scrollbar-width: thin;
      }
      .split-cols,
      .split-row {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
        align-items: center;
      }
      .split-cols {
        position: sticky;
        top: 0;
        z-index: 1;
        height: 22px;
        background: var(--se-panel);
        border-bottom: var(--se-border) solid var(--se-line-soft);
        font-size: var(--se-fs-xs);
        color: var(--se-faint);
      }
      .split-row { height: 28px; }
      .split-cols > div,
      .split-row > div {
        min-width: 0;
        height: 100%;
        display: flex;
        align-items: center;
        padding: 0 10px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .split-cols > div:first-child,
      .split-row > div:first-child { padding: 0 0 0 12px; }
      .split .num { justify-content: flex-end; font-variant-numeric: tabular-nums; }

      /* An unticked row is grey but its first value, so the eye finds it. */
      .split-row:not(.on) > div:nth-child(n + 3) { color: var(--se-faint); }
      .split-row.marked { background: var(--se-row-hover); box-shadow: var(--se-mark-bar); }
      .split .split-row > div.soon { color: var(--se-warning); }
      .split .split-row > div.past { color: var(--se-danger); }

      .split .amount.typing { box-shadow: var(--se-cell-focus); }
      .split .amount.wrong { box-shadow: var(--se-cell-held); color: var(--se-danger); }
      .split .caret {
        display: inline-block;
        width: 1px;
        height: 15px;
        margin-left: 1px;
        background: var(--se-ink);
      }

      .tick {
        display: inline-grid;
        place-items: center;
        width: 15px;
        height: 15px;
        box-sizing: border-box;
        background: var(--se-panel);
        border: var(--se-border) solid var(--se-box-line);
        border-radius: var(--se-radius-xs);
        cursor: pointer;
      }
      .tick.on { background: var(--se-accent); border-color: var(--se-accent); }
      .tick.on::after {
        content: '';
        width: 7px;
        height: 4px;
        border-left: 2px solid var(--se-panel);
        border-bottom: 2px solid var(--se-panel);
        transform: translateY(-1px) rotate(-45deg);
      }

      .split-keys {
        display: flex;
        gap: 14px;
        padding: 6px 12px 8px;
        font-size: var(--se-fs-xs);
        color: var(--se-faint);
      }
      .split-keys kbd { font: inherit; color: var(--se-ink-2); }
`
