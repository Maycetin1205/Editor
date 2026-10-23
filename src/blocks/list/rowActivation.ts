import { chainsRead } from '../../core/data/steps/chains'
import {
  selectionFor,
  giverIdOf,
  chooseSelection,
  setSelection,
} from '../../runtime/selection'
import { runEvent, type ActionResult } from '../../runtime/events'
import { rowsIndexOf, rowsTraitOf } from './sourceRows'

export const ROW_ACTIVATED_EVENT = 'ff-row-activate'

export const ROW_CHOSEN = 'rowChosen'
export const ROW_DOUBLE = 'rowDouble'
export const KEY_F4 = 'keyF4'

export interface RowActivatedDetail {
  rawRow: unknown

  rawIndex: number

  viewIndex: number
}

const ROW_ATTR = 'data-ff-row'

function sendRowActivated(el: HTMLElement, detail: RowActivatedDetail): void {
  el.dispatchEvent(new CustomEvent<RowActivatedDetail>(ROW_ACTIVATED_EVENT, {
    detail,
    bubbles: true,
    composed: true,
  }))
}

export class RowsChoice {
  private readonly block: HTMLElement

  private ownTrait = ''

  private lastSlot: { rows: readonly unknown[]; trait: string; slot: number } | null = null

  constructor(block: HTMLElement) {
    this.block = block
  }

  private get giverId(): string {
    return giverIdOf(this.block)
  }

  private get trait(): string {
    const id = this.giverId
    return id === '' ? this.ownTrait : rowsTraitOf(this.block, selectionFor(id))
  }

  slotIn(rows: readonly unknown[]): number {
    const trait = this.trait
    if (trait === '') return -1
    const last = this.lastSlot
    if (last !== null && last.rows === rows && last.trait === trait) {
      return last.slot
    }
    const slot = rows.findIndex((row) => rowsTraitOf(this.block, row) === trait)
    this.lastSlot = { rows, trait, slot }
    return slot
  }

  toggle(row: unknown): boolean {
    const trait = rowsTraitOf(this.block, row)
    const id = this.giverId
    if (id === '') {
      this.ownTrait = this.ownTrait === trait ? '' : trait
      return this.ownTrait !== ''
    }
    chooseSelection(id, row, trait)
    return trait !== '' && rowsTraitOf(this.block, selectionFor(id)) === trait
  }

  forget(): void {
    this.ownTrait = ''
    this.lastSlot = null
  }
}

export function focusedRowKey(root: ShadowRoot | null): string | null | undefined {
  const active = root?.activeElement
  if (!(active instanceof HTMLElement)) return undefined
  const row = active.closest<HTMLElement>('.row')
  if (!row) return undefined
  return row.getAttribute(ROW_ATTR)
}

export function rowElement(root: ShadowRoot | null | undefined, key: string): HTMLElement | undefined {
  return [...root?.querySelectorAll<HTMLElement>(`.row[${ROW_ATTR}]`) ?? []]
    .find((row) => row.getAttribute(ROW_ATTR) === key)
}

export function moveRowsFocus(from: EventTarget | null, direction: number): boolean {
  if (!(from instanceof HTMLElement)) return false
  const row = from.closest<HTMLElement>('.row')
  const body = row?.parentElement
  if (!row || !body) return false
  const rows = [...body.querySelectorAll<HTMLElement>(`.row[${ROW_ATTR}]`)]
  const at = rows.indexOf(row)
  const target = at === -1 ? undefined : rows[at + direction]
  if (!target) return false
  target.focus()
  target.scrollIntoView?.({ block: 'nearest' })
  return true
}

export function focusFirstRow(from: EventTarget | null): boolean {
  if (!(from instanceof HTMLElement)) return false
  const first = from.closest<HTMLElement>('.table')
    ?.querySelector<HTMLElement>(`.row[${ROW_ATTR}]`)
  if (!first) return false
  first.focus()
  return true
}

export function focusSearchRow(from: EventTarget | null): boolean {
  if (!(from instanceof HTMLElement)) return false
  const field = from.closest<HTMLElement>('.table')
    ?.querySelector<HTMLInputElement>('.search-row input')
  if (!field) return false
  field.focus()
  return true
}

export function restoreRowsFocus(root: ShadowRoot | null, key: string | null): void {
  if (!root) return
  const wanted = key === null ? undefined : rowElement(root, key)
  const target = wanted
    ?? root.querySelector<HTMLElement>(`.row[${ROW_ATTR}]`)
    ?? root.querySelector<HTMLElement>('.body')
  target?.focus()
}

export function activateRow(
  el: HTMLElement,
  choice: RowsChoice,
  rawRows: readonly unknown[],
  rawIndex: number | null,
  viewIndex: number,
): void {
  if (rawIndex === null) return
  const rawRow = rawRows[rawIndex]
  if (rawRow === undefined) return

  if (!choice.toggle(rawRow)) {
    sendRowActivated(el, { rawRow, rawIndex: -1, viewIndex })
    return
  }
  sendRowActivated(el, { rawRow, rawIndex, viewIndex })
  void runEvent(el, ROW_CHOSEN, { PINDEX: rowsIndexOf(el, rawRow) })
}

export function rowDouble(
  el: HTMLElement,
  rawRows: readonly unknown[],
  rawIndex: number | null,
): void {
  if (rawIndex === null) return
  const rawRow = rawRows[rawIndex]
  if (rawRow === undefined) return
  void runEvent(el, ROW_DOUBLE, { PINDEX: rowsIndexOf(el, rawRow) })
}

interface ActionRowElement extends HTMLElement {
  rawRows: unknown[]
}

export function takesActionKey(el: HTMLElement): boolean {
  return (chainsRead(el.getAttribute('data-ff-actions'))[KEY_F4]?.length ?? 0) > 0
}

export function actionKeyAtRow(
  el: ActionRowElement,
  choice: RowsChoice,
  e: KeyboardEvent,
  slotOf: (key: string) => number,
  takes: (trait: string) => boolean,
): { trait: string; result: Promise<ActionResult> } | undefined {
  if (e.defaultPrevented || e.key !== 'F4'
    || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return undefined
  if (!takesActionKey(el)) return undefined
  e.preventDefault()
  e.stopPropagation()
  if (e.repeat) return undefined

  const focus = focusedRowKey(el.shadowRoot)
  const slot = focus === undefined ? choice.slotIn(el.rawRows) : focus === null ? -1 : slotOf(focus)
  const row = el.rawRows[slot]
  if (row === undefined) return undefined
  const trait = rowsTraitOf(el, row)
  if (!takes(trait)) return undefined
  setSelection(giverIdOf(el), row, true, trait)
  const record = rowsIndexOf(el, row)
  const result = runEvent(el, KEY_F4, { PINDEX: record, DROP_PINDEX: record }, `${KEY_F4} ${trait}`)
  return { trait, result }
}
