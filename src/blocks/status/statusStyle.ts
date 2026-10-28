import { css, unsafeCSS } from 'lit'
import { rowsHigh } from '../../core/block/grid'

// The box of a field: a chip stands on its line.
const BOX = rowsHigh(2)

// A state as a chip: a dot in the tone and the word, on the soft ground of
// the tone; as a dot, the word stands in the ink beside it. With its label
// the chip stands as high as the box of a field beside it, on its line.
export const statusStyle = css`
  :host { display: block; }

  .status {
    display: flex;
    flex-direction: column;
    row-gap: 2px;
    min-width: 0;
  }

  .label {
    min-width: 0;
    color: var(--se-ink-2);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    line-height: 14px;
    white-space: nowrap;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-height: ${unsafeCSS(BOX)}px;
  }

  .chip {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    height: 22px;
    padding: 0 10px 0 8px;
    border-radius: var(--se-radius-chip);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }
  .form-chip .chip {
    background: var(--tone-soft);
    color: var(--tone-ink);
  }
  .form-dot .chip {
    padding: 0;
    color: var(--se-ink);
    font-size: var(--se-fs);
    font-weight: 400;
  }

  .dot {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--tone-strong);
  }

  .word {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`
