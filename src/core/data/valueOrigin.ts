import type { Parameter } from './actions'
import type { KeyPair } from './extraSources'

export type ValueOrigin =
  | { kind: 'fixed'; value: string }
  | { kind: 'event'; value: string }
  | { kind: 'row'; value: string }
  | { kind: 'helper'; sourceId?: string; value: string }
  | { kind: 'document'; sourceId: string; value: string }
  | { kind: 'source'; sourceId: string; value: string }
  | { kind: 'formField'; blockId: string; prop: string }
  | { kind: 'chosenRow'; blockId: string; value: string }
  | { kind: 'sum'; blockId: string; value: string }
  | { kind: 'captured'; blockId: string; value: string }
  | { kind: 'changed'; blockId: string; value: string }
  | { kind: 'split'; blockId: string; value: string }
  | { kind: 'step'; stepId: string; field?: string }
  | { kind: 'previous' }
  | { kind: 'variable'; value: string }

export type OriginKind = ValueOrigin['kind']

export function parameterOrigin(p: Parameter): ValueOrigin | null {
  switch (p.source) {
    case 'fixed': return { kind: 'fixed', value: p.value }
    case 'context': return { kind: 'event', value: p.value }
    case 'dataField': return { kind: 'source', sourceId: p.sourceId ?? '', value: p.value }
    case 'blockValue': return { kind: 'formField', blockId: p.blockId ?? '', prop: p.value }
    case 'chosenRow': return { kind: 'chosenRow', blockId: p.blockId ?? '', value: p.value }
    case 'captureCell': return { kind: 'captured', blockId: p.blockId ?? '', value: p.value }
    case 'changeCell': return { kind: 'changed', blockId: p.blockId ?? '', value: p.value }
    case 'splitCell': return { kind: 'split', blockId: p.blockId ?? '', value: p.value }
    case 'stepResult': return { kind: 'step', stepId: p.value, ...(p.resultField ? { field: p.resultField } : {}) }
    case 'previousResult': return { kind: 'previous' }
    case 'seVariable': return { kind: 'variable', value: p.value }
    case 'omitted': return null
  }
}

export function originParameter(o: ValueOrigin): Parameter | null {
  switch (o.kind) {
    case 'fixed': return { source: 'fixed', value: o.value }
    case 'event': return { source: 'context', value: o.value }
    case 'source': return { source: 'dataField', sourceId: o.sourceId, value: o.value }
    case 'formField': return { source: 'blockValue', blockId: o.blockId, value: o.prop }
    case 'chosenRow': return { source: 'chosenRow', blockId: o.blockId, value: o.value }
    case 'captured': return { source: 'captureCell', blockId: o.blockId, value: o.value }
    case 'changed': return { source: 'changeCell', blockId: o.blockId, value: o.value }
    case 'split': return { source: 'splitCell', blockId: o.blockId, value: o.value }
    case 'step': return { source: 'stepResult', value: o.stepId, ...(o.field ? { resultField: o.field } : {}) }
    case 'previous': return { source: 'previousResult', value: '' }
    case 'variable': return { source: 'seVariable', value: o.value }
    default: return null
  }
}

export function pairOrigin(pair: KeyPair, partner: (field: string) => ValueOrigin): ValueOrigin | null {
  if (pair.fromField === '') return null
  if (pair.from === 'document') return { kind: 'document', sourceId: pair.fromSourceId ?? '', value: pair.fromField }
  if (pair.from === 'formField') return { kind: 'formField', blockId: pair.fromField, prop: pair.fromProp ?? 'value' }
  return partner(pair.fromField)
}

export function originPair(o: ValueOrigin, toField: string): KeyPair | null {
  switch (o.kind) {
    case 'document': return { fromField: o.value, toField, from: 'document', fromSourceId: o.sourceId }
    case 'formField': return { fromField: o.blockId, toField, from: 'formField', fromProp: o.prop }
    case 'row':
    case 'helper':
    case 'chosenRow':
      return { fromField: o.value, toField }
    default: return null
  }
}
