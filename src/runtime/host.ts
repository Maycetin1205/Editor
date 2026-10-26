import type { MaskHost } from './maskHost'
import { previewHost } from './previewHost'

// The host the mask runs in. The editor keeps the preview host, which answers
// nothing; an exported mask installs SoftEngine when it starts, see
// softEngineStart.ts.
let current: MaskHost = previewHost

export function maskHost(): MaskHost {
  return current
}

export function installHost(next: MaskHost): void {
  current = next
}
