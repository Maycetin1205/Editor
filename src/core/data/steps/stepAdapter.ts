import type { Parameter } from '../actions'
import { isUnread, type Unread } from '../../unread'

export interface StepCondition {
  sourceId: string

  rows: boolean
}

export interface StepBase {
  id: string
  kind: string

  resultName: string

  note?: string

  onlyIf?: StepCondition
}

// A step as the exported mask carries it: without the id, references turned
// into names and positions.
export interface RuntimeStepBase {
  kind: string
  resultName: string
  onlyIf?: StepCondition
}

export interface ExportRefs {
  popupName: (id: string) => string
  stepPosition: (id: string) => string
  columnsIndex: (blockId: string, key: string) => string
}

export function conditionRead(raw: unknown): { onlyIf?: StepCondition } {
  if (!isUnread<StepCondition>(raw)) return {}
  const sourceId = typeof raw.sourceId === 'string' ? raw.sourceId.trim() : ''
  if (sourceId === '' || typeof raw.rows !== 'boolean') return {}
  return { onlyIf: { sourceId, rows: raw.rows } }
}

// What the editor and the export know about a kind of step. Running a step
// is the runtime's business: see src/runtime/steps.
export interface StepAdapter<S extends StepBase, R extends RuntimeStepBase> {
  kind: S['kind']
  // Whether SoftEngine answers this step: a mask with such a step starts the
  // host when it loads.
  answers: boolean
  read(raw: Unread<S>, base: { id: string; resultName: string }): S | null
  readExported(raw: Unread<R>, resultName: string): R | null
  export(step: S, refs: ExportRefs): R
  bindings(step: S | R): readonly Parameter[]
  withBindings(step: S, map: (binding: Parameter) => Parameter): S
  withBlockIds(step: S, newId: (oldId: string) => string | undefined): S
  relationId(step: S | R): string
}
