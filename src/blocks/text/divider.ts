import { css, html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'

// The Text drawn as a divider: a line across its room, or down it, with the
// words of the text in the middle when it has any. In the editor a chosen
// divider without words shows where they go, to be named by double click.

interface DividerHost {
  readonly text: string
  readonly direction: string
  readonly thickness: number
  readonly preview: boolean
  readonly editable: boolean
  rename(event: MouseEvent): void
}

export function dividerTpl(host: DividerHost): TemplateResult {
  const direction = host.direction === 'vertical' ? 'vertical' : 'horizontal'
  const word = host.text.trim()
  const blank = word === '' && host.preview && host.editable
  return html`<div
    class="divider ${direction}"
    role="separator"
    aria-orientation=${direction}
    style=${styleMap({ '--divider-thickness': `${host.thickness}px` })}
  ><div class="line"></div>${
    word === '' && !blank
      ? nothing
      : html`<span class=${blank ? 'word blank' : 'word'} data-ff-editable @dblclick=${host.rename}
            >${blank ? 'Wort' : word}</span
          ><div class="line"></div>`
  }</div>`
}

export const dividerStyle = css`
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
  .word.blank { color: var(--se-placeholder); }
`
