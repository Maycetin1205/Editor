import { css } from 'lit'
import { TABLE_PART_CSS } from '../parts'

const { table } = TABLE_PART_CSS

// The card around the table. Inside an area, popup or dialog the frame around
// it already draws the edge, so only the bottom line stays.
export const frameStyle = css`
  :host { min-width: 0; height: 100%; }

  .${table} {
    --se-cell-x: 12px;
    --se-input-x: 4px;

    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--se-panel);
    border: var(--se-hair);
    border-radius: var(--se-radius-card);
    overflow: hidden;
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 400;
    color: var(--se-ink);
  }
  :host-context(ff-area) .${table},
  :host-context(ff-popup) .${table},
  :host-context(ff-dialog) .${table} {
    border-width: 0 0 var(--se-border);
    border-radius: 0;
  }
`
