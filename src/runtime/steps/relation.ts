import { readDeclared } from '../../core/block/registry'
import { SOURCE_PROPERTY } from '../../core/block/sharedProperties'
import { BLOCK_ID_ATTR, COLUMN_PARAM_SOURCES, RECORD_PLACEHOLDER, type Parameter } from '../../core/data/actions'
import { NO_CONFIRMATION, type PutConfirm } from '../../core/data/jobs'
import { POSITION_DELETE_NR, positionsConfirm, type PositionsWrite } from '../../core/data/positions'
import type { RuntimeRelation } from '../../core/data/relations'
import type { RuntimeRelationStep } from '../../core/data/steps/relation'
import type { StepRun, StepRunner } from './stepRunner'

function sourceOfBlock(el: Element | undefined): string {
  return el === undefined ? '' : (readDeclared(el, SOURCE_PROPERTY) ?? '')
}

function positionsWrite(
  template: RuntimeRelation,
  bindings: readonly Parameter[],
  run: StepRun,
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
  run: StepRun,
): PutConfirm | undefined {
  if (template.verb === 'GET_RELATION') return undefined
  const write = positionsWrite(template, bindings, run)
  return write && positionsConfirm(run.host, template, params, write)
}

export const relationRunner: StepRunner<RuntimeRelationStep> = {
  kind: 'RELATION',
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
}
