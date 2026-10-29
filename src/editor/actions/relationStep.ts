import type { ComponentType } from 'react'
import type { RelationTemplate, RelationVerb } from '../../core/data/relations'
import type { RelationStep } from '../../core/data/steps/relation'
import { GetRelationBody, PutRelationBody } from './RelationBody'
import type { StepBodyProps, StepContext, StepSummary, StepTab, StepTabDef } from './stepTypes'

const VERB_SHORT: Record<RelationVerb, string> = {
  GET_RELATION: 'GET',
  PUT_RELATION: 'PUT',
  PUTADD_RELATION: 'PUTADD',
}

// The verbs a mask can send, each with its tab. SoftEngine drops a
// PUTADD_RELATION from a mask without a word; only its formulas may add.
const VERB_TAB = {
  GET_RELATION: 'GET',
  PUT_RELATION: 'PUT',
} as const satisfies Partial<Record<RelationVerb, StepTab>>

type MaskVerb = keyof typeof VERB_TAB

const emptyRelation = (id: string): RelationStep => ({
  id,
  kind: 'RELATION',
  resultName: '',
  relationId: '',
  parameter: [],
  extraParameter: [],
})

const templateOf = (step: RelationStep, context: StepContext): RelationTemplate | undefined =>
  context.relations.find((r) => r.id === step.relationId)

export const relationSummary: StepSummary<'RELATION'> = {
  words(step, context) {
    const t = templateOf(step, context)
    return { words: t?.name ?? 'Relation', short: t ? `${VERB_SHORT[t.verb]} ${t.nr}` : '', known: t !== undefined }
  },
  tab(step, context) {
    return templateOf(step, context)?.verb === 'GET_RELATION' ? 'GET' : 'PUT'
  },
}

function relationTab(verb: MaskVerb, Body: ComponentType<StepBodyProps>): StepTabDef {
  const key = VERB_TAB[verb]
  return {
    key,
    name: `${key} Relation`,
    count: (context) => context.relations.filter((r) => r.verb === verb).length,
    start(id, step, context) {
      if (step?.kind !== 'RELATION') return emptyRelation(id)
      return templateOf(step, context)?.verb === verb ? step : emptyRelation(id)
    },
    Body,
  }
}

export const getTab = relationTab('GET_RELATION', GetRelationBody)
export const putTab = relationTab('PUT_RELATION', PutRelationBody)
