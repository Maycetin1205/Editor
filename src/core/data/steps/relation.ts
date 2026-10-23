import { readDeclared } from '../../block/registry'
import { SOURCE_PROPERTY } from '../../block/sourceProperty'
import {
  BLOCK_ID_ATTR,
  COLUMN_PARAM_SOURCES,
  RECORD_PLACEHOLDER,
  checkParameterBinding,
  type Parameter,
} from '../actions'
import { NO_CONFIRMATION, type PutConfirm } from '../jobs'
import { POSITION_DELETE_NR, positionsConfirm, type PositionsWrite } from '../positions'
import type { RuntimeRelation } from '../relations'
import type { Unread } from '../../unread'
import type { StepAdapter, StepBase } from './stepAdapter'

export interface RelationStep extends StepBase {
  kind: 'RELATION'

  relationId: string

  parameter: Parameter[]

  extraParameter: Parameter[]
}

export type RuntimeRelationStep = Omit<RelationStep, 'id'>

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
): { relationId: string; parameter: Parameter[]; extraParameter: Parameter[] } | null {
  if (typeof raw.relationId !== 'string') return null
  const parameter = bindingsRead(raw.parameter)
  const extraParameter = bindingsRead(raw.extraParameter)
  if (!parameter || !extraParameter) return null
  return { relationId: raw.relationId, parameter, extraParameter }
}

function withBindings(step: RelationStep, map: (binding: Parameter) => Parameter): RelationStep {
  const parameter = step.parameter.map(map)
  const extraParameter = step.extraParameter.map(map)
  const changed =
    parameter.some((b, i) => b !== step.parameter[i]) || extraParameter.some((b, i) => b !== step.extraParameter[i])
  return changed ? { ...step, parameter, extraParameter } : step
}

type Run = Parameters<StepAdapter<'RELATION'>['run']>[1]

function sourceOfBlock(el: Element | undefined): string {
  return el === undefined ? '' : (readDeclared(el, SOURCE_PROPERTY) ?? '')
}

function positionsWrite(
  template: RuntimeRelation,
  bindings: readonly Parameter[],
  run: Run,
): PositionsWrite | undefined {
  if (template.nr.trim() === POSITION_DELETE_NR) {
    const row = run.parameterValues.chosenRow?.(run.origin.getAttribute(BLOCK_ID_ATTR) ?? '')
    const sourceId = sourceOfBlock(run.origin)
    return row === undefined || sourceId === '' ? undefined : { kind: 'removed', sourceId, row }
  }
  if (RECORD_PLACEHOLDER.some((name) => (run.values[name] ?? '') !== '')) return undefined
  const blockId = bindings.find((b) => COLUMN_PARAM_SOURCES[b.source] === 'captured')?.blockId
  if (blockId === undefined || blockId === '') return undefined
  const block = Array.from(run.root.querySelectorAll(`[${BLOCK_ID_ATTR}]`)).find(
    (el) => el.getAttribute(BLOCK_ID_ATTR) === blockId,
  )
  const sourceId = sourceOfBlock(block)
  return sourceId === '' ? undefined : { kind: 'added', sourceId }
}

function putConfirm(
  template: RuntimeRelation,
  params: readonly string[],
  bindings: readonly Parameter[],
  run: Run,
): PutConfirm | undefined {
  if (template.verb === 'GET_RELATION') return undefined
  const write = positionsWrite(template, bindings, run)
  return write && positionsConfirm(run.host, template, params, write)
}

export const relation: StepAdapter<'RELATION'> = {
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
    }
  },
  async run(step, run) {
    const template = run.host.relation(step.relationId)
    if (!template) return { failed: true }

    const bindings = [...step.parameter, ...step.extraParameter]

    const missingRecord = RECORD_PLACEHOLDER.find(
      (name) => bindings.some((b) => b.source === 'context' && b.value === name) && (run.values[name] ?? '') === '',
    )
    if (missingRecord !== undefined) return { failed: true }

    const missingAnswer = bindings.some(
      (b) => b.source === 'stepResult' && run.parameterValues.stepRawResults?.[Number(b.value)] === undefined,
    )
    if (missingAnswer) return { failed: true, reason: NO_CONFIRMATION }

    const params = bindings.map((binding) => run.host.resolveParameter(binding, run.parameterValues))
    const sendOnly = template.verb !== 'GET_RELATION' && run.lastForRow
    const confirm = sendOnly ? undefined : putConfirm(template, params, bindings, run)
    const answer = await run.host.runRelation(template, params, {
      origin: run.jobOrigin,
      ...(confirm === undefined ? {} : { confirm }),
      ...(sendOnly ? { sendOnly } : {}),
    })
    const failed = answer.failed === true
    return {
      failed,
      ...(failed && answer.reason !== undefined ? { reason: answer.reason } : {}),
      answer: {
        value: answer.value,
        raw: answer.raw,
        wrote: template.verb !== 'GET_RELATION',
        ...(answer.confirmed === undefined ? {} : { confirmed: answer.confirmed }),
        ...(answer.confirmed === false && answer.reason !== undefined ? { reason: answer.reason } : {}),
        ...(answer.record === undefined ? {} : { record: answer.record }),
      },
    }
  },
  bindings: (step) => [...step.parameter, ...step.extraParameter],
  withBindings,
  withBlockIds(step, newId) {
    return withBindings(step, (b) => {
      const target = b.blockId === undefined || b.blockId === '' ? undefined : newId(b.blockId)
      return target === undefined ? b : { ...b, blockId: target }
    })
  },
  relationId: (step) => step.relationId,
}
