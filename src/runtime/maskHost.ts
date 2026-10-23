import type { RuntimeSource } from '../core/data/dataSources'
import type { StepHost } from '../core/data/steps/stepAdapter'

export interface MaskHost extends StepHost {
  start(): void
  hasData(): boolean
  onData(listener: (delivery: boolean) => void): () => void

  writeField(row: unknown, code: string, value: string): boolean

  requestFreshData(): void

  fetchRows(source: RuntimeSource, giverRow: unknown, chosen?: (giverId: string) => unknown): Promise<void>
}
