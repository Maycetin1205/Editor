import type { PendingKind } from '../block/capability'
import type { RelationTemplate } from './relations'
import { isUnread } from '../unread'

export const BLOCK_ID_ATTR = 'data-ff-block-id'

const PARAMETER_SOURCES = [
  'fixed',
  'context',
  'dataField',
  'blockValue',
  'chosenRow',

  'captureCell',

  'changeCell',

  'splitCell',
  'previousResult',
  'stepResult',
  'seVariable',
] as const

const SAVED_PARAM_SOURCES = [...PARAMETER_SOURCES, 'omitted'] as const

export const COLUMN_PARAM_SOURCES: Record<string, PendingKind> = {
  captureCell: 'captured',
  changeCell: 'changed',
}

export const CELLS_PARAM_SOURCES: Record<string, PendingKind> = {
  ...COLUMN_PARAM_SOURCES,
  splitCell: 'captured',
}

export interface PickValues {
  amount: string
  read: (field: string) => string
}

export type ParameterSource = (typeof SAVED_PARAM_SOURCES)[number]

export interface Parameter {
  source: ParameterSource

  value: string

  sourceId?: string

  blockId?: string

  resultField?: string
}

export const RECORD_PLACEHOLDER = ['PINDEX', 'DROP_PINDEX'] as const

// FROM_VALUE: the value a card of a board leaves when it moves.
export const ACTION_PLACEHOLDER = [...RECORD_PLACEHOLDER, 'VALUE', 'FROM_VALUE', 'NOW_DATE', 'NOW_TIME'] as const

export function relationParameterDefault(
  relation: Pick<RelationTemplate, 'parameter'>,
): Parameter[] {
  return relation.parameter.map((raw) => {
    const placeholder = /^\{([A-Za-z0-9_]+)\}$/.exec(raw)?.[1]
    return placeholder && (ACTION_PLACEHOLDER as readonly string[]).includes(placeholder)
      ? { source: 'context', value: placeholder }
      : { source: 'fixed', value: '' }
  })
}

export interface RuntimeValues {
  context: Readonly<Record<string, string | undefined>>
  previousResult: string

  stepResults?: readonly string[]

  stepRawResults?: readonly unknown[]

  chosenRow?: (giverId: string) => unknown

  rowsCell?: (blockId: string, columnsIndex: number) => string

  pick?: PickValues
}

export function checkParameterBinding(raw: unknown): Parameter | null {
  if (!isUnread<Parameter>(raw)) return null
  if (
    typeof raw.source !== 'string'
    || !(SAVED_PARAM_SOURCES as readonly string[]).includes(raw.source)
    || typeof raw.value !== 'string'
  ) return null
  if (raw.sourceId !== undefined && typeof raw.sourceId !== 'string') return null
  if (raw.blockId !== undefined && typeof raw.blockId !== 'string') return null
  if (raw.resultField !== undefined && typeof raw.resultField !== 'string') return null
  return {
    source: raw.source as ParameterSource,
    value: raw.value,
    ...(typeof raw.sourceId === 'string' ? { sourceId: raw.sourceId } : {}),
    ...(typeof raw.blockId === 'string' ? { blockId: raw.blockId } : {}),

    ...(raw.source === 'stepResult' && typeof raw.resultField === 'string'
      ? { resultField: raw.resultField }
      : {}),
  }
}
