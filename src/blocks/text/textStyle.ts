import { css, unsafeCSS } from 'lit'
import { rowsHigh } from '../../core/block/grid'

const BOX = rowsHigh(2)

export const textStyle = css`
  /* The frame is the room of the block on the grid; the text in it is as
     high as its lines and stands at its top, unless the area around it
     centers its texts, as the band does. */
  .frame {
    box-sizing: border-box;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: var(--se-text-justify, flex-start);
  }
  .frame > .text { flex: none; }

  /* Beschriftung: the label over the text, as .label over the box of a
     field: the same type on a 14 px line, 2 px above the value, which
     stands 5 px lower so that it reads on the line of the value in the box
     beside it; a text and a field with their labels stand on one line and
     are as high. */
  .frame > .with-label {
    flex: none;
    display: flex;
    flex-direction: column;
    row-gap: 2px;
  }
  .with-label > .text,
  .pair > .text {
    flex: none;
    padding-top: 5px;
  }

  /* Pairs: several fields under the name of each. A name stands over its
     value as the label over the text; the pairs stand side by side and go
     on to the next line where the block is too narrow, from the edge the
     text is aligned to. An empty value is a dash in the second ink. */
  .frame > .with-label.pairs {
    flex-direction: row;
    flex-wrap: wrap;
    column-gap: 24px;
    row-gap: 4px;
  }
  .pairs.align-center { justify-content: center; }
  .pairs.align-right { justify-content: flex-end; }
  .pair {
    display: flex;
    flex-direction: column;
    row-gap: 2px;
    min-width: 0;
  }
  .words.blank { color: var(--se-ink-2); }
  .label {
    min-width: 0;
    padding-inline: 0;
    color: var(--se-ink-2);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 400;
    line-height: 14px;
  }

  .text {
    box-sizing: border-box;
    padding-inline: 0;
    color: var(--se-ink);
    font-family: var(--se-font);
    font-weight: 400;

    --text-line-height: var(--se-lh);
    line-height: var(--text-line-height);
    white-space: pre-wrap;
    overflow-wrap: anywhere;

    /* The text is as high as its lines, an empty one as high as one line;
       the frame follows the text, not the other way round. */
    min-height: calc(1em * var(--text-line-height));
  }
  .text.quiet { color: var(--se-ink-2); }
  .text.bold {
    color: var(--se-accent);
    font-weight: 600;
  }

  .align-center { text-align: center; }
  .align-right { text-align: right; }

  /* A framed value stands in one line as high as the box of a field; the
     label over it stands 2 px above, so the text is as high as a field with
     its label. Kasten: as a field that only shows, in a grey box with a
     hairline, in the second ink. Linie unten: the value in its ink on the
     hairline, flush with the label. */
  .text.boxed,
  .text.lined {
    min-height: ${unsafeCSS(BOX)}px;
    line-height: max(${unsafeCSS(BOX)}px - 2 * var(--se-border), calc(1em * var(--text-line-height)));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .text.boxed {
    padding: 0 10px;
    background: var(--se-read-ground);
    border: var(--se-hair);
    border-radius: var(--se-radius);
    color: var(--se-ink-2);
  }
  .text.boxed.bold { color: var(--se-accent); }
  .text.lined {
    padding-top: var(--se-border);
    border-bottom: var(--se-hair);
  }
  .boxed.with-symbol,
  .lined.with-symbol { align-items: center; }
  .boxed .words,
  .lined .words {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The symbol before the words: in the middle of the first line, a little
     larger than the type, faint. */
  .with-symbol {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .with-symbol.align-center { justify-content: center; }
  .with-symbol.align-right { justify-content: flex-end; }
  .symbol {
    flex: none;
    display: grid;
    place-items: center;
    height: calc(1em * var(--text-line-height));
    color: var(--se-faint);
  }
  .symbol .icon { width: 1.15em; height: 1.15em; }
  .with-symbol .words { min-width: 0; }

  /* A field woven into the words, in the editor: its name on a tint of the
     accent, so the words around it read as typed and the field as a slot. */
  .slot {
    padding: 0 3px;
    border-radius: var(--se-radius-xs);
    background: var(--se-accent-soft);
    color: var(--se-accent-dark);
    font-weight: 400;
  }

  /* A text that starts an action, in the mask. */
  :host([data-ff-actions]:not([preview])) .words { cursor: pointer; }
  :host([data-ff-actions]:not([preview])) .words:hover { text-decoration: underline; }
`
