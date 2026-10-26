import { html, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import type { RowConfirm } from '../../runtime/steps/confirm'
import type { ActionResult } from '../../runtime/events'
import { warn } from '../../runtime/log'
import { maskHost } from '../../runtime/host'
import { moveRowsFocus, rowElement } from './rowActivation'
import { rowsIndexOf, rowsTraitOf } from './sourceRows'
import type { RowDecoration } from './tableBody'

interface AskElement extends HTMLElement {
  rawRows: unknown[]
  requestUpdate(): void
  readonly updateComplete: Promise<boolean>
}

interface Asking {
  trait: string
  above: boolean
  left: number
  resolve: (yes: boolean) => void
}

const MARK_MS = 10_000

function stop(e: Event): void {
  e.stopPropagation()
}

export class RowAsk {
  private readonly el: AskElement

  private readonly chosen: () => number

  private readonly keyOf: (rawIndex: number) => string

  private asking: Asking | null = null

  private readonly running = new Set<string>()

  private readonly dropping = new Map<string, 'waiting' | 'out'>()

  private unfollow: (() => void) | null = null

  constructor(el: AskElement, chosen: () => number, keyOf: (rawIndex: number) => string) {
    this.el = el
    this.chosen = chosen
    this.keyOf = keyOf
  }

  takes(trait: string): boolean {
    return this.asking === null && !this.dropping.has(trait)
  }

  track(trait: string, result: Promise<ActionResult>): void {
    this.running.add(trait)
    const settle = (r: ActionResult): void => {
      this.running.delete(trait)
      const through = r.state === 'ran' || r.state === 'unconfirmed'
      if (!r.written || through) this.dropping.delete(trait)
      else if (this.dropping.has(trait)) {
        this.dropping.set(trait, 'out')
        setTimeout(() => {
          if (this.dropping.get(trait) === 'out' && this.dropping.delete(trait)) this.el.requestUpdate()
        }, MARK_MS)
      }
      this.el.requestUpdate()
    }
    void result.then(settle)
  }

  connect(): void {
    this.unfollow ??= maskHost().onData((delivery) => {
      if (!delivery) return
      let ended = false
      for (const [trait, state] of this.dropping) {
        if (state === 'out') ended = this.dropping.delete(trait) || ended
      }
      if (ended) this.el.requestUpdate()
    })
  }

  disconnect(): void {
    this.unfollow?.()
    this.unfollow = null
  }

  readonly asked = (e: Event): void => {
    const detail = (e as CustomEvent<RowConfirm>).detail
    if (this.asking !== null) return
    const rawIndex =
      detail.record === ''
        ? this.chosen()
        : this.el.rawRows.findIndex((row) => rowsIndexOf(this.el, row) === detail.record)
    const row = rawIndex < 0 ? undefined : this.rowAt(rawIndex)
    if (row === undefined) return
    const body = row.closest('.body')
    const frame = row.getBoundingClientRect()
    const name = row.querySelectorAll<HTMLElement>(':scope > [role="cell"]')[1]?.getBoundingClientRect()
    const zoom = row.offsetWidth > 0 ? frame.width / row.offsetWidth : 1
    const asking = {
      trait: rowsTraitOf(this.el, this.el.rawRows[rawIndex]),
      above: body !== null && frame.bottom + frame.height > body.getBoundingClientRect().bottom,
      left: name === undefined ? 0 : (name.left - frame.left) / zoom,
    }
    detail.answer = new Promise<boolean>((resolve) => {
      this.asking = { ...asking, resolve }
    })
    this.el.requestUpdate()
    this.el.updateComplete
      .then(() =>
        this.el.shadowRoot?.querySelector<HTMLElement>('.row-ask > .ask-drop')?.focus({ preventScroll: true }),
      )
      .catch((error: unknown) => {
        warn('Rückfrage nicht gezeichnet', error)
      })
  }

  checkShown(): void {
    if (this.asking !== null && !this.el.shadowRoot?.querySelector('.row-ask')) this.answer(false)
  }

  decorate(own: RowDecoration, rawIndex: number | null): RowDecoration {
    if (rawIndex === null || (this.asking === null && this.dropping.size === 0)) return own
    const trait = rowsTraitOf(this.el, this.el.rawRows[rawIndex])
    if (this.asking?.trait === trait) {
      return {
        ...own,
        className: [own.className, 'asking', this.asking.above ? 'ask-above' : ''].filter((c) => c !== '').join(' '),
        right: html`${own.right}${this.askTpl(this.asking)}`,
      }
    }
    if (!this.dropping.has(trait)) return own
    return {
      ...own,
      className: [own.className, 'dropping'].filter((c) => c !== '').join(' '),
      right: html`${own.right}<span class="drop-note">Wird gelöscht …</span>`,
    }
  }

  private rowAt(rawIndex: number): HTMLElement | undefined {
    return rowElement(this.el.shadowRoot, this.keyOf(rawIndex))
  }

  private answer(yes: boolean): void {
    const asking = this.asking
    if (asking === null) return
    this.asking = null
    if (yes && this.running.has(asking.trait)) this.dropping.set(asking.trait, 'waiting')
    asking.resolve(yes)
    const rawIndex = this.el.rawRows.findIndex((row) => rowsTraitOf(this.el, row) === asking.trait)
    const key = rawIndex < 0 ? '' : this.keyOf(rawIndex)
    this.el.requestUpdate()
    this.el.updateComplete
      .then(() => {
        const row = rowElement(this.el.shadowRoot, key)
        if (!row) return
        if (!yes || !(moveRowsFocus(row, 1) || moveRowsFocus(row, -1))) row.focus()
      })
      .catch((error: unknown) => {
        warn('Liste nach der Rückfrage nicht gezeichnet', error)
      })
  }

  private readonly askKey = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const buttons = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button')
      buttons[e.key === 'ArrowLeft' ? 0 : buttons.length - 1]?.focus()
    } else if (e.key === 'Escape') {
      this.answer(false)
    } else if (e.key !== 'Enter' && e.key !== ' ') {
      return
    }
    if (e.key !== 'Enter' && e.key !== ' ') e.preventDefault()
    e.stopPropagation()
  }

  private readonly askLeft = (e: FocusEvent): void => {
    const to = e.relatedTarget
    if (to instanceof Node && (e.currentTarget as HTMLElement).contains(to)) return
    this.answer(false)
  }

  private askTpl(asking: Asking): TemplateResult {
    return html`<span
      class="row-ask"
      role="group"
      aria-label="Position löschen?"
      style=${styleMap({ left: `${asking.left}px` })}
      @click=${stop}
      @dblclick=${stop}
      @keydown=${this.askKey}
      @focusout=${this.askLeft}
    ><button type="button" class="ask-drop" @click=${() => this.answer(true)}>Löschen</button><button
      type="button"
      class="ask-keep"
      @click=${() => this.answer(false)}
    >Abbrechen</button></span>`
  }
}
