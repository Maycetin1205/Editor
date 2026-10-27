import type { Parameter, RuntimeValues } from '../../core/data/actions'
import type { RuntimeSource } from '../../core/data/dataSources'
import type { JobReason, RunAnswer, RunOptions } from '../../core/data/jobs'
import type { RuntimeRelation } from '../../core/data/relations'
import type { RuntimeStepBase } from '../../core/data/steps/stepAdapter'

// What a running step may ask of the host the mask runs in.
export interface StepHost {
  relation(id: string): RuntimeRelation | undefined
  sources(): RuntimeSource[]
  source(id: string): RuntimeSource | undefined
  rows(source: RuntimeSource): unknown[]
  readField(row: unknown, code: string): string
  resolveParameter(binding: Parameter, values: RuntimeValues): string
  runRelation(relation: RuntimeRelation, params: readonly string[], options?: RunOptions): Promise<RunAnswer>
  startTool(toolNumber: string, params: readonly string[]): boolean
}

export interface StepRun {
  host: StepHost
  root: ParentNode
  origin: HTMLElement
  jobOrigin: string
  lastForRow: boolean
  values: Readonly<Record<string, string | undefined>>
  parameterValues: RuntimeValues
}

export interface StepOutcome {
  failed: boolean

  reason?: JobReason

  answer?: { value: string; raw: unknown; wrote: boolean; confirmed?: boolean; reason?: JobReason; record?: string }
}

export interface StepRunner<R extends RuntimeStepBase> {
  kind: R['kind']
  run(step: R, run: StepRun): Promise<StepOutcome>
}
