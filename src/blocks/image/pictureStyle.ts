import { css } from 'lit'

export const pictureStyle = css`
  :host { display: block; height: 100%; }

  /* The picture fills the room of the block on the grid: fitted in, it keeps
     its proportions and stands at the edge the block is aligned to; filling,
     it covers the room and loses what sticks out. */
  .frame {
    box-sizing: border-box;
    height: 100%;
    min-height: 24px;
    display: flex;
    align-items: center;
    overflow: hidden;
  }
  .align-left { justify-content: flex-start; }
  .align-center { justify-content: center; }
  .align-right { justify-content: flex-end; }

  img {
    display: block;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .rounded img,
  .rounded .empty { border-radius: var(--se-radius-card); }

  :host([data-ff-actions]:not([preview])) .frame { cursor: pointer; }

  /* No picture, or one that does not load: a quiet room with the sign of a
     picture; in the editor it says what is missing. */
  .empty {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px;
    background: var(--se-panel-2);
    border: 1px dashed var(--se-line);
    border-radius: var(--se-radius);
    color: var(--se-faint);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    line-height: 14px;
    text-align: center;
    overflow: hidden;
  }
  .empty svg { flex: none; width: 24px; height: 24px; }
  .empty .what { color: var(--se-ink-2); overflow-wrap: anywhere; }
  .empty .how { font-size: var(--se-fs-xs); }
`
