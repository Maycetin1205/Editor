import type { MaskHost } from './maskHost'

export const previewHost: MaskHost = {
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
