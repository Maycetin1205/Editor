import { TABLE_PART } from './parts'

// Moves the keyboard focus between the rows and the search line, and finds a
// row again after the list was drawn anew.

const ROW_ATTR = 'data-ff-row'

const ROW = `.${TABLE_PART.row}`

const KEYED_ROW = `${ROW}[${ROW_ATTR}]`

export function focusedRowKey(root: ShadowRoot | null): string | null | undefined {
  const active = root?.activeElement
  if (!(active instanceof HTMLElement)) return undefined
  const row = active.closest<HTMLElement>(ROW)
  if (!row) return undefined
  return row.getAttribute(ROW_ATTR)
}

export function rowElement(root: ShadowRoot | null | undefined, key: string): HTMLElement | undefined {
  return [...(root?.querySelectorAll<HTMLElement>(KEYED_ROW) ?? [])].find((row) => row.getAttribute(ROW_ATTR) === key)
}

export function moveRowsFocus(from: EventTarget | null, direction: number): boolean {
  if (!(from instanceof HTMLElement)) return false
  const row = from.closest<HTMLElement>(ROW)
  const body = row?.parentElement
  if (!row || !body) return false
  const rows = [...body.querySelectorAll<HTMLElement>(KEYED_ROW)]
  const at = rows.indexOf(row)
  const target = at === -1 ? undefined : rows[at + direction]
  if (!target) return false
  target.focus()
  target.scrollIntoView?.({ block: 'nearest' })
  return true
}

export function focusFirstRow(from: EventTarget | null): boolean {
  if (!(from instanceof HTMLElement)) return false
  const first = from.closest<HTMLElement>(`.${TABLE_PART.table}`)?.querySelector<HTMLElement>(KEYED_ROW)
  if (!first) return false
  first.focus()
  return true
}

export function focusSearchRow(from: EventTarget | null): boolean {
  if (!(from instanceof HTMLElement)) return false
  const field = from.closest<HTMLElement>(`.${TABLE_PART.table}`)?.querySelector<HTMLInputElement>('.search-row input')
  if (!field) return false
  field.focus()
  return true
}

export function restoreRowsFocus(root: ShadowRoot | null, key: string | null): void {
  if (!root) return
  const wanted = key === null ? undefined : rowElement(root, key)
  const target =
    wanted ?? root.querySelector<HTMLElement>(KEYED_ROW) ?? root.querySelector<HTMLElement>(`.${TABLE_PART.body}`)
  target?.focus()
}
