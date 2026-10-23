import type { Parameter, RuntimeValues } from '../actions'
import type { RuntimeSource } from '../dataSources'
import type { JobReason, RunAnswer, RunOptions } from '../jobs'
import type { RuntimeRelation } from '../relations'
import type { RuntimeStep, Step, StepKind } from './steps'
import type { Unread } from '../../unread'

export interface StepCondition {
  sourceId: string

  rows: boolean
}

export interface StepBase {
  id: string
  kind: StepKind

  resultName: string

  note?: string

  onlyIf?: StepCondition
}

type StepOf<K extends StepKind> = Step & { kind: K }
type RuntimeStepOf<K extends StepKind> = RuntimeStep & { kind: K }

interface ExportRefs {
  popupName: (id: string) => string
  stepPosition: (id: string) => string
  columnsIndex: (blockId: string, key: string) => string
}

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

interface StepRun {
  host: StepHost
  root: ParentNode
  origin: HTMLElement
  jobOrigin: string
  lastForRow: boolean
  values: Readonly<Record<string, string | undefined>>
  parameterValues: RuntimeValues
}

interface StepOutcome {
  failed: boolean

  reason?: JobReason

  answer?: { value: string; raw: unknown; wrote: boolean; confirmed?: boolean; reason?: JobReason; record?: string }
}

export interface StepAdapter<K extends StepKind> {
  kind: K
  answers: boolean
  read(raw: Unread<StepOf<K>>, base: { id: string; resultName: string }): StepOf<K> | null
  readExported(raw: Unread<RuntimeStepOf<K>>, resultName: string): RuntimeStepOf<K> | null
  export(step: StepOf<K>, refs: ExportRefs): RuntimeStepOf<K>
  run(step: RuntimeStepOf<K>, run: StepRun): Promise<StepOutcome>
  bindings(step: StepOf<K> | RuntimeStepOf<K>): readonly Parameter[]
  withBindings(step: StepOf<K>, map: (binding: Parameter) => Parameter): StepOf<K>
  withBlockIds(step: StepOf<K>, newId: (oldId: string) => string | undefined): StepOf<K>
  relationId(step: StepOf<K> | RuntimeStepOf<K>): string
}
