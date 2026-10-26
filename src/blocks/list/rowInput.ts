import type { RowDecoration } from './listHooks'
import { focusSearchRow, moveRowsFocus } from './rowFocus'

// What a click, a double click and a key on a row do. A typing cell inside the
// row keeps its clicks and keys for itself.

export function rowClicked(e: MouseEvent, chosen: boolean, activate: () => void): void {
  if (chosen && (e.detail > 1 || (e.target as HTMLElement).closest('.cell-input'))) return
  activate()
}

export function rowDoubleClicked(e: MouseEvent, double: () => void): void {
  if ((e.target as HTMLElement).closest('.cell-input')) return
  double()
}

export function rowKeyDown(e: KeyboardEvent, decoration: RowDecoration, activate: () => void): void {
  if ((e.target as HTMLElement).closest('.cell-input, button')) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const up = e.key === 'ArrowUp'
    const moved = moveRowsFocus(e.target, up ? -1 : 1)
    if (moved || (up && focusSearchRow(e.target))) e.preventDefault()
    return
  }
  if (decoration.key(e)) {
    e.preventDefault()
    return
  }
  if (e.key !== 'Enter') return
  e.preventDefault()
  activate()
}
