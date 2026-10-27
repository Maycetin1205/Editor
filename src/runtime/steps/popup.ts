import { blockType } from '../../core/block/registry'

export function inOpenPopup(el: Element): boolean {
  const tag = blockType('popup')?.tag
  return tag !== undefined && el.closest(`${tag}[open]`) !== null
}

// Opens or closes the one popup of that name; with two of the same name
// nothing moves, the mask would not know which one was meant.
export function applyPopupStep(root: ParentNode, name: string, open: boolean): void {
  if (name.trim() === '') return

  const popupType = blockType('popup')
  const all = popupType === undefined ? [] : Array.from(root.querySelectorAll(popupType.tag))
  const hit = all.filter((el) => (el.getAttribute('name') ?? popupType?.properties.name?.default) === name)
  if (hit.length !== 1) return
  const target = hit[0]
  if (!open) {
    target.removeAttribute('open')
    return
  }
  for (const el of all) {
    if (el !== target) el.removeAttribute('open')
  }
  target.setAttribute('open', '')
}
