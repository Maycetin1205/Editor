import { css, html, nothing, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'
import { icon } from '../parts/icons'
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
  readonly day: DayControl
}

interface DayControl {
  readonly inputDay: string
  choose(day: string): void
  step(days: number): void
  today(): void
}

export function fieldControlTpl(kind: FieldType, host: ControlHost, options: readonly string[]): TemplateResult {
  if (kind === 'group') return groupTpl(host, options)
  if (kind === 'day') return dayTpl(host)
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

// The Tagwahl: the day of the mask between a step back and a step on, and
// Heute at the end of the box, which goes where the box gets narrow.
function dayTpl(host: ControlHost): TemplateResult {
  const day = host.day
  const keys = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      host.goOn()
    }
  }
  return html`<div class="ctrl day">
    <button type="button" class="step" aria-label="Vortag" tabindex="-1" @click=${() => day.step(-1)}>${icon(
      'caretLeft',
    )}</button>
    <input
      class="day-input"
      type="date"
      aria-label=${host.label}
      .value=${live(day.inputDay)}
      @change=${(e: Event) => day.choose((e.target as HTMLInputElement).value)}
      @keydown=${keys}
    />
    <button type="button" class="step" aria-label="Folgetag" tabindex="-1" @click=${() => day.step(1)}>${icon(
      'caretRight',
    )}</button>
    <button type="button" class="today" @click=${day.today}>Heute</button>
  </div>`
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

export const controlStyle = css`
  .kind-day .value {
    padding: 2px;
    container-type: inline-size;
  }

  .day {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 100%;
  }

  .step,
  .today {
    flex: none;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: var(--se-radius-xs);
    background: transparent;
    font-family: var(--se-font);
    cursor: pointer;
    transition: background-color var(--se-move);
  }
  .step {
    display: grid;
    place-items: center;
    width: 24px;
    color: var(--se-ink-2);
  }
  .step .icon { width: 14px; height: 14px; }
  .today {
    padding: 0 10px;
    color: var(--se-accent-dark);
    font-size: var(--se-fs);
    font-weight: 600;
  }
  .step:hover { background: var(--se-hover); }
  .today:hover { background: var(--se-accent-soft); }
  .step:focus-visible,
  .today:focus-visible {
    outline: 2px solid var(--se-accent);
    outline-offset: -2px;
  }

  .day-input {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    margin: 0;
    padding: 0 4px;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }
  /* The calendar of the browser beside the day, not over the corner of the
     box where a date field keeps it. */
  .day-input::-webkit-calendar-picker-indicator {
    position: static;
    width: 14px;
    height: 14px;
    margin: 0 0 0 4px;
    opacity: 0.5;
    cursor: pointer;
  }
  .day-input::-webkit-calendar-picker-indicator:hover { opacity: 0.9; }

  @container (max-width: 200px) {
    .today { display: none; }
  }

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
