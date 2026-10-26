import { contractOf } from '../core/block/registry'
import { BLOCK_ID_ATTR } from '../core/data/actions'

// Fields whose tops differ by less than this stand in one line.
const SAME_LINE_PX = 8

// Enter moves on to the next field in reading order: line by line from the
// top, and from left to right within a line.
export function focusNextField(from: HTMLElement): void {
  const fields = Array.from(from.ownerDocument.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`))
    .flatMap((el) => {
      const field = contractOf(el, 'actionValue')
      const rect = el.getBoundingClientRect()
      return field && rect.width > 0 ? [{ el, field, rect }] : []
    })
    .sort((a, b) =>
      Math.abs(a.rect.top - b.rect.top) > SAME_LINE_PX ? a.rect.top - b.rect.top : a.rect.left - b.rect.left,
    )
  const at = fields.findIndex((f) => f.el === from)
  if (at !== -1) fields[at + 1]?.field.focusValue('value')
}
