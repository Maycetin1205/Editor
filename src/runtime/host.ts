import type { RuntimeSource } from '../core/data/dataSources'
import type { StepHost } from './steps/stepRunner'

export interface MaskHost extends StepHost {
  start(): void
  hasData(): boolean
  onData(listener: (delivery: boolean) => void): () => void

  writeField(row: unknown, code: string, value: string): boolean

  requestFreshData(): void

  fetchRows(source: RuntimeSource, giverRow: unknown, chosen?: (giverId: string) => unknown): Promise<void>
}

const previewHost: MaskHost = {
  start: () => {},
  hasData: () => false,
  onData: () => () => {},

  sources: () => [],
  source: () => undefined,
  rows: () => [],
  readField: () => '',
  writeField: () => false,

  relation: () => undefined,
  resolveParameter: () => '',
  runRelation: () => Promise.resolve({ value: '', raw: undefined, failed: true }),
  startTool: () => false,
  requestFreshData: () => {},

  fetchRows: () => Promise.resolve(),
}

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
