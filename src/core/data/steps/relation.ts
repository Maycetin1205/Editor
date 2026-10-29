import { COLUMN_PARAM_SOURCES, checkParameterBinding, type Parameter } from '../actions'
import type { Unread } from '../../unread'
import { spreadRead, type PickSpread } from './spread'
import type { RuntimeStepBase, StepAdapter, StepBase } from './stepAdapter'

export interface RelationStep extends StepBase {
  kind: 'RELATION'

  relationId: string

  parameter: Parameter[]

  extraParameter: Parameter[]

  spread?: PickSpread
}

export interface RuntimeRelationStep extends RuntimeStepBase {
  kind: 'RELATION'
  relationId: string
  parameter: Parameter[]
  extraParameter: Parameter[]
  spread?: PickSpread
}

function bindingsRead(raw: unknown): Parameter[] | null {
  if (!Array.isArray(raw)) return null
  const params: Parameter[] = []
  for (const value of raw) {
    const binding = checkParameterBinding(value)
    if (!binding) return null
    params.push(binding)
  }
  return params
}

function relationFields(
  raw: Unread<RuntimeRelationStep>,
): { relationId: string; parameter: Parameter[]; extraParameter: Parameter[]; spread?: PickSpread } | null {
  if (typeof raw.relationId !== 'string') return null
  const parameter = bindingsRead(raw.parameter)
  const extraParameter = bindingsRead(raw.extraParameter)
  if (!parameter || !extraParameter) return null
  return { relationId: raw.relationId, parameter, extraParameter, ...spreadRead(raw.spread) }
}

function withBindings(step: RelationStep, map: (binding: Parameter) => Parameter): RelationStep {
  const parameter = step.parameter.map(map)
  const extraParameter = step.extraParameter.map(map)
  const changed =
    parameter.some((b, i) => b !== step.parameter[i]) || extraParameter.some((b, i) => b !== step.extraParameter[i])
  return changed ? { ...step, parameter, extraParameter } : step
}

export const relation: StepAdapter<RelationStep, RuntimeRelationStep> = {
  kind: 'RELATION',
  answers: true,
  read(raw, base) {
    const fields = relationFields(raw)
    return fields && { id: base.id, kind: 'RELATION', resultName: base.resultName, ...fields }
  },
  readExported(raw, resultName) {
    const fields = relationFields(raw)
    return fields && { kind: 'RELATION', resultName, ...fields }
  },
  export(step, refs) {
    const binding = (b: Parameter): Parameter => {
      if (b.source === 'stepResult') return { ...b, value: refs.stepPosition(b.value) }

      if (COLUMN_PARAM_SOURCES[b.source] !== undefined) {
        return { ...b, value: refs.columnsIndex(b.blockId ?? '', b.value) }
      }
      return { ...b }
    }
    return {
      kind: step.kind,
      resultName: step.resultName,
      relationId: step.relationId,
      parameter: step.parameter.map(binding),
      extraParameter: step.extraParameter.map(binding),
      ...(step.spread && step.spread.start > 0 ? { spread: { ...step.spread } } : {}),
    }
  },
  bindings: (step) => [...step.parameter, ...step.extraParameter],
  withBindings,
  withBlockIds(step, newId) {
    const moved = withBindings(step, (b) => {
      const target = b.blockId === undefined || b.blockId === '' ? undefined : newId(b.blockId)
      return target === undefined ? b : { ...b, blockId: target }
    })
    const spreadTo = moved.spread && newId(moved.spread.blockId)
    return spreadTo === undefined || moved.spread === undefined
      ? moved
      : { ...moved, spread: { ...moved.spread, blockId: spreadTo } }
  },
  relationId: (step) => step.relationId,
}
