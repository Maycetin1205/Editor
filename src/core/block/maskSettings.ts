import { ROOT_ID, type MaskTree } from './tree'

// What the root of a mask holds for the whole mask: its name, the frame
// (Rahmen) of SoftEngine it is exported for, and the folder it is exported to.

export const MASK_NAME_PROP = 'maskName'
export const MASK_NAME_DEFAULT = 'Maske'

export function maskNameOf(tree: MaskTree): string {
  const raw = tree[ROOT_ID]?.values[MASK_NAME_PROP]
  const name = typeof raw === 'string' ? raw.trim() : ''
  return name === '' ? MASK_NAME_DEFAULT : name
}

export const DOCUMENT_FRAME_PROP = 'documentFrame'

export const FRAME_SPOTS = 5

function frameNumber(raw: unknown): string {
  const text = typeof raw === 'string' ? raw.trim() : typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : ''
  if (!/^\d{1,5}$/.test(text) || Number(text) === 0) return ''
  return text.padStart(FRAME_SPOTS, '0')
}

export function frameNumberOf(tree: MaskTree): string {
  return frameNumber(tree[ROOT_ID]?.values[DOCUMENT_FRAME_PROP])
}

export function documentFileNames(number: string): { html: string; sevariablen: string } {
  return {
    html: `Rahmen${number}.basis.source.html`,
    sevariablen: `Rahmen${number}.basis.SEvariablen.json`,
  }
}

export const EXPORT_TARGET_PROP = 'exportTarget'

export function exportTargetOf(tree: MaskTree): string {
  const raw = tree[ROOT_ID]?.values[EXPORT_TARGET_PROP]
  return typeof raw === 'string' ? raw.trim() : ''
}
