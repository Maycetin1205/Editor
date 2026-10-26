import { TAKES_KEYS_ATTR } from '../../core/block/typingMarks'
import type { RowAsk } from './rowAsk'
import { actionKeyAtRow, takesActionKey, type RowsChoice } from './rowActivation'

interface KeysElement extends HTMLElement {
  rawRows: unknown[]
  readonly preview: boolean
}

// The keys the whole block listens to: F4 runs the action at the focused or
// chosen row, F5 stays with the mask instead of reloading the page. While F4
// has an action the table carries a mark, so the host passes the keys on to
// the mask when the table is used.
export class HostKeys {
  private readonly el: KeysElement

  private readonly choice: RowsChoice

  private readonly ask: RowAsk

  private readonly slotOf: (key: string) => number

  constructor(el: KeysElement, choice: RowsChoice, ask: RowAsk, slotOf: (key: string) => number) {
    this.el = el
    this.choice = choice
    this.ask = ask
    this.slotOf = slotOf
  }

  private readonly actionKey = (e: KeyboardEvent): void => {
    const run = actionKeyAtRow(this.el, this.choice, e, this.slotOf, (trait) => this.ask.takes(trait))
    if (run) this.ask.track(run.trait, run.result)
  }

  private readonly locksReload = (e: KeyboardEvent): void => {
    if (!this.el.preview && e.key === 'F5' && !e.ctrlKey && !e.metaKey) e.preventDefault()
  }

  connect(): void {
    this.el.addEventListener('keydown', this.actionKey)
    this.el.addEventListener('keydown', this.locksReload)
  }

  markTable(): void {
    this.el.shadowRoot
      ?.querySelector('.table')
      ?.toggleAttribute(TAKES_KEYS_ATTR, !this.el.preview && takesActionKey(this.el))
  }

  disconnect(): void {
    this.el.removeEventListener('keydown', this.actionKey)
    this.el.removeEventListener('keydown', this.locksReload)
  }
}
