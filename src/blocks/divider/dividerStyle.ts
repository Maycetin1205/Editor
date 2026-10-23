import { css } from 'lit'

export const dividerStyle = css`
  :host { display: block; height: 100%; }

  .divider {
    box-sizing: border-box;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .divider.vertical { flex-direction: column; }

  .line { flex: 1 1 auto; }
  .horizontal .line {
    border-top: var(--divider-thickness) solid var(--se-line);
    margin-bottom: calc(var(--se-border) - var(--divider-thickness));
  }
  .vertical .line {
    border-left: var(--divider-thickness) solid var(--se-line);
    margin-right: calc(var(--se-border) - var(--divider-thickness));
  }

  .word {
    flex: none;
    color: var(--se-ink-2);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    line-height: 14px;
    white-space: nowrap;
  }
`
