import { css, html, nothing, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'
import { forInput } from './inputValue'
import type { FieldType } from './properties'

// How the field draws its control for each type, apart from looking up and
// the checkbox. The field hands in its words and what its control calls.
interface ControlHost {
  readonly label: string
  readonly value: string
  readonly showLabel: boolean
  readonly preview: boolean
  input(e: Event): void
  change(): void
  key(e: KeyboardEvent): void
  focus(): void
  blur(): void
  choose(option: string): void
  goOn(): void
}

export function fieldControlTpl(kind: FieldType, host: ControlHost, options: readonly string[]): TemplateResult {
  if (kind === 'group') return groupTpl(host, options)
  if (host.preview) return html`<span class="shown">${host.value}</span>`
  if (kind === 'select') return selectTpl(host, options)
  if (kind === 'multiline') {
    return html`<textarea
      class="ctrl"
      aria-label=${host.label}
      .value=${live(host.value)}
      @input=${host.input}
      @focus=${host.focus}
      @blur=${host.blur}
      @keydown=${host.key}
    ></textarea>`
  }
  return html`<input
    class="ctrl"
    type=${kind}
    aria-label=${host.label}
    placeholder=${kind === 'search' && !host.showLabel ? host.label : nothing}
    .value=${live(forInput(kind, host.value))}
    @input=${host.input}
    @focus=${host.focus}
    @blur=${host.blur}
    @keydown=${host.key}
  />`
}

// A value no entry names stays in the list, hidden, so that the field shows
// what SoftEngine holds.
function selectTpl(host: ControlHost, options: readonly string[]): TemplateResult {
  const foreignValue = host.value !== '' && !options.includes(host.value)
  return html`<span class="shown">${host.value}</span><select
    class="ctrl"
    aria-label=${host.label}
    .value=${live(host.value)}
    @input=${host.input}
    @change=${host.change}
    @keydown=${host.key}
  >
    <option value="" hidden></option>
    ${foreignValue ? html`<option value=${host.value} hidden selected>${host.value}</option>` : nothing}
    ${options.map((o) => html`<option value=${o} ?selected=${o === host.value}>${o}</option>`)}
  </select>`
}

// The Auswahlgruppe: every entry side by side in the box of the field, the
// chosen one on the soft accent. A group of radio buttons to the keyboard:
// Tab reaches the chosen entry, the arrows, Home and End choose, Enter goes
// on to the next field as from any field.
const STEPS: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

function targetOf(key: string, at: number, count: number): number | null {
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  const step = STEPS[key]
  return step === undefined ? null : (at + step + count) % count
}

function groupTpl(host: ControlHost, options: readonly string[]): TemplateResult {
  const chosen = options.indexOf(host.value)
  const tabStop = chosen === -1 ? 0 : chosen
  const onKey = (e: KeyboardEvent, at: number): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      host.goOn()
      return
    }
    const target = targetOf(e.key, at, options.length)
    if (target === null) return
    e.preventDefault()
    host.choose(options[target])
    const button = (e.currentTarget as HTMLElement).parentElement?.children[target]
    if (button instanceof HTMLElement) button.focus()
  }
  return html`<div class="ctrl group" role="radiogroup" aria-label=${host.label}>${options.map(
    (option, at) =>
      html`<button
        type="button"
        role="radio"
        class=${at === chosen ? 'option on' : 'option'}
        aria-checked=${at === chosen ? 'true' : 'false'}
        tabindex=${!host.preview && at === tabStop ? 0 : -1}
        @click=${() => host.choose(option)}
        @keydown=${(e: KeyboardEvent) => onKey(e, at)}
      >${option}</button>`,
  )}</div>`
}

export const choiceGroupStyle = css`
  .kind-group .value { padding: 2px; }

  .group {
    display: flex;
    gap: 2px;
    height: 100%;
  }

  .option {
    flex: 1 1 0;
    min-width: 0;
    margin: 0;
    padding: 0 8px;
    border: 0;
    border-radius: var(--se-radius-xs);
    background: transparent;
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    transition: background-color var(--se-move);
  }
  .option:hover { background: var(--se-hover); }
  .option.on {
    background: var(--se-accent-soft);
    color: var(--se-accent-dark);
    font-weight: 600;
  }
  .option:focus-visible {
    outline: 2px solid var(--se-accent);
    outline-offset: -2px;
  }
`
