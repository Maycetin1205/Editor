import { COLUMN_PARAM_SOURCES, checkParameterBinding, type Parameter } from '../actions'
import type { Unread } from '../../unread'
import type { StepAdapter, StepBase } from './stepAdapter'

export interface StartToolStep extends StepBase {
  kind: 'START_TOOL'

  toolNumber: string

  parameter: Parameter[]
}

export type RuntimeStartToolStep = Omit<StartToolStep, 'id'>

function parameterRead(raw: unknown): Parameter[] | null {
  if (!Array.isArray(raw)) return null
  const params: Parameter[] = []
  for (const value of raw) {
    const binding = checkParameterBinding(value)
    if (!binding) return null
    params.push(binding)
  }
  return params
}

function toolFields(raw: Unread<RuntimeStartToolStep>): { toolNumber: string; parameter: Parameter[] } | null {
  if (typeof raw.toolNumber !== 'string') return null
  const parameter = parameterRead(raw.parameter)
  return parameter && { toolNumber: raw.toolNumber, parameter }
}

function withBindings(step: StartToolStep, map: (binding: Parameter) => Parameter): StartToolStep {
  const parameter = step.parameter.map(map)
  return parameter.some((b, i) => b !== step.parameter[i]) ? { ...step, parameter } : step
}

export const startTool: StepAdapter<'START_TOOL'> = {
  kind: 'START_TOOL',
  answers: false,
  read(raw, base) {
    const fields = toolFields(raw)
    return fields && { id: base.id, kind: 'START_TOOL', resultName: base.resultName, ...fields }
  },
  readExported(raw, resultName) {
    const fields = toolFields(raw)
    return fields && { kind: 'START_TOOL', resultName, ...fields }
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
      toolNumber: step.toolNumber,
      parameter: step.parameter.map(binding),
    }
  },
  run(step, run) {
    const toolNumber = step.toolNumber.trim()
    if (toolNumber === '') return Promise.resolve({ failed: true })
    const params = step.parameter.map((binding) => run.host.resolveParameter(binding, run.parameterValues))
    return Promise.resolve({ failed: !run.host.startTool(toolNumber, params) })
  },
  bindings: (step) => step.parameter,
  withBindings,
  withBlockIds(step, newId) {
    return withBindings(step, (b) => {
      const target = b.blockId === undefined || b.blockId === '' ? undefined : newId(b.blockId)
      return target === undefined ? b : { ...b, blockId: target }
    })
  },
  relationId: () => '',
}
