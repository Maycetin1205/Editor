import { html, type TemplateResult } from 'lit'
import type { CaptureLedger } from './ledger'
import { answerDrop } from './ledger/capturing'

// The question at the typing row before an emptied corrected row goes: the
// buttons and keys of the question at a booked row (list/rowAsk.ts).

function askKey(ledger: CaptureLedger, e: KeyboardEvent): void {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const buttons = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button')
    buttons[e.key === 'ArrowLeft' ? 0 : buttons.length - 1]?.focus()
  } else if (e.key === 'Escape') {
    answerDrop(ledger, false, true)
  } else if (e.key !== 'Enter' && e.key !== ' ') {
    return
  }
  if (e.key !== 'Enter' && e.key !== ' ') e.preventDefault()
  e.stopPropagation()
}

function askLeft(ledger: CaptureLedger, e: FocusEvent): void {
  const to = e.relatedTarget
  if (to instanceof Node && (e.currentTarget as HTMLElement).contains(to)) return
  answerDrop(ledger, false, false)
}

export function dropAskTpl(ledger: CaptureLedger): TemplateResult {
  return html`<span
    class="row-ask"
    role="group"
    aria-label="Position löschen?"
    @keydown=${(e: KeyboardEvent) => askKey(ledger, e)}
    @focusout=${(e: FocusEvent) => askLeft(ledger, e)}
  ><button type="button" class="ask-drop" @click=${() => answerDrop(ledger, true, true)}>Löschen</button><button
    type="button"
    class="ask-keep"
    @click=${() => answerDrop(ledger, false, true)}
  >Abbrechen</button></span>`
}
