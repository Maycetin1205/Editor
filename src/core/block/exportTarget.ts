import { ROOT_ID, type MaskTree } from './tree'

export const EXPORT_TARGET_PROP = 'exportTarget'

export function exportTargetOf(tree: MaskTree): string {
  const raw = tree[ROOT_ID]?.values[EXPORT_TARGET_PROP]
  return typeof raw === 'string' ? raw.trim() : ''
}
