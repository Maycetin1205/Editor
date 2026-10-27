import { css } from 'lit'
import { TABLE_PART } from '../list/parts'

// The input fields in the cells of a capture row: how they look, and how the
// capture finds and enters them.

// quiet: as it is; changed: a booked cell with a change not yet written;
// automatic: a cell of the typing row filled from the chosen record.
type CellsState = 'quiet' | 'changed' | 'automatic'

const CELL_CLASS: Record<CellsState, string> = {
  quiet: 'cell-input',
  changed: 'cell-input changed',
  automatic: 'cell-input auto',
}

export function cellsClass(state: CellsState): string {
  return CELL_CLASS[state]
}

// The input fields of the slots inside the area, a selector such as the
// typing row or a booked row.
export function cellsFields(
  root: ShadowRoot | null | undefined,
  area: string,
  slots: readonly number[],
): HTMLInputElement[] {
  if (slots.length === 0) return []
  const found = root?.querySelectorAll<HTMLInputElement>(
    slots.map((slot) => `${area} .${TABLE_PART.cellInput}[data-column="${slot}"]`).join(', '),
  )
  return found === undefined ? [] : Array.from(found)
}

export function enterCell(field: HTMLInputElement | null | undefined): boolean {
  if (!field) return false
  field.focus()
  field.select()
  field.scrollIntoView({ block: 'nearest' })
  return true
}

export const cellsInputStyle = css`
      .cell-holder {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
        min-width: 0;
      }

      .cell-holder.upward .suggestions {
        top: auto;
        bottom: 100%;
        margin: 0 0 4px;
      }

      .cell-input {
        box-sizing: border-box;
        width: 100%;
        height: calc(var(--row-height) - 8px);
        min-width: 0;
        padding: 0 var(--se-input-x);
        font-family: var(--se-font);
        font-size: var(--se-fs);
        font-weight: 400;
        color: var(--se-ink);
        background: transparent;
        border: var(--se-border) solid transparent;
        border-radius: var(--se-radius);
      }

      /* No box in a row, in the capture row as little as in any other: a
         cell being typed into looks like any other, only with the cursor;
         the capture row marks that cell with a lower edge of the accent
         (captureStyle). */
      .cell-input:focus { outline: none; }

      .right .cell-holder > .cell-input { text-align: right; }

      /* The quiet words of an empty cell, in the faint ink. */
      .cell-input::placeholder { color: transparent; }
      .row.capture .cell-input::placeholder { color: var(--se-placeholder); }
      .row:focus-within .cell-input::placeholder { color: var(--se-placeholder); }

      /* Taken from the chosen record and shown like any other value: a tint or
         italics made the row look foreign. */
      .cell-input.auto {
        color: var(--se-ink);
      }
`
