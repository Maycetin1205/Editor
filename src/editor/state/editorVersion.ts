import { version } from '../../../package.json'

export const EDITOR_VERSION: string = version

function parts(text: string): number[] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(text.trim())
  return match ? match.slice(1, 4).map(Number) : null
}

export function newerEditor(stamp: unknown): string | null {
  if (typeof stamp !== 'string') return null
  const theirs = parts(stamp)
  const ours = parts(EDITOR_VERSION)
  if (theirs === null || ours === null) return null
  for (let i = 0; i < 3; i++) {
    if (theirs[i] !== ours[i]) return theirs[i] > ours[i] ? stamp.trim() : null
  }
  return null
}
