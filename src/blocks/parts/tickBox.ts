import { css, html, type TemplateResult } from 'lit'
import { icon } from './icons'

export const tickBoxStyle = css`
  .box {
    position: relative;
    flex: none;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
  }
  .box input {
    position: absolute;
    inset: 0;
    width: 20px;
    height: 20px;
    margin: 0;
    border: 1.5px solid var(--se-box-line);
    border-radius: var(--se-radius-sm);
    background: var(--se-panel);
    cursor: pointer;
    appearance: none;
    transition: background-color var(--se-move), border-color var(--se-move);
  }
  .box input:hover { border-color: var(--se-ink-2); background: var(--se-hover); }
  .box input:checked { border-color: var(--se-ink-2); }
  .box input:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }
  .box .icon {
    position: relative;
    width: 12px;
    height: 12px;
    color: var(--se-ink);
    visibility: hidden;
    pointer-events: none;
  }
  .box input:checked + .icon { visibility: visible; }
`

export function tickBoxTpl(input: TemplateResult): TemplateResult {
  return html`<span class="box">${input}${icon('check')}</span>`
}
