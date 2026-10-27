import { BLOCK_ID_ATTR } from '../../core/data/actions'

// The block an action step refers to by id, anywhere under the root.
export function searchCarrier(root: ParentNode, blockId: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`)).find(
    (el) => el.getAttribute(BLOCK_ID_ATTR) === blockId,
  )
}
