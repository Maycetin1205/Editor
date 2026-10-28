import type { ComponentType } from 'react'
import type { RelationTemplate, RelationVerb } from '../../core/data/relations'
import type { RelationStep } from '../../core/data/steps/relation'
import { GetRelationBody, PutAddRelationBody, PutRelationBody } from './RelationBody'
import type { StepBodyProps, StepContext, StepSummary, StepTab, StepTabDef } from './stepTypes'

// Short form of the verb; it is also the key of the verb's tab.
const VERB_SHORT = {
  GET_RELATION: 'GET',
  PUT_RELATION: 'PUT',
  PUTADD_RELATION: 'PUTADD',
} as const satisfies Record<RelationVerb, StepTab>

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
    const t = templateOf(step, context)
    return t ? VERB_SHORT[t.verb] : 'PUT'
  },
}

function relationTab(verb: RelationVerb, Body: ComponentType<StepBodyProps>): StepTabDef {
  const key = VERB_SHORT[verb]
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
export const putAddTab = relationTab('PUTADD_RELATION', PutAddRelationBody)
