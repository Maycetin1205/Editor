import type { ComponentType } from 'react'
import { relationGroup, type RelationTemplate } from '../../core/data/relations'
import type { RelationStep } from '../../core/data/steps/relation'
import { ReadRelationBody, WriteRelationBody } from './RelationBody'
import type { StepBodyProps, StepContext, StepPiece, StepTabPiece } from './stepPiece'

const VERB_SHORT: Record<RelationTemplate['verb'], string> = {
  GET_RELATION: 'GET',
  PUT_RELATION: 'PUT',
  PUTADD_RELATION: 'PUTADD',
}

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

export const relationPiece: StepPiece<'RELATION'> = {
  words(step, context) {
    const t = templateOf(step, context)
    return { words: t?.name ?? 'Relation', short: t ? `${VERB_SHORT[t.verb]} ${t.nr}` : '', known: t !== undefined }
  },
  tab: (step, context) => (templateOf(step, context)?.verb === 'GET_RELATION' ? 'GET' : 'PUT'),
}

function relationTab(
  key: 'GET' | 'PUT',
  name: string,
  group: 'read' | 'write',
  Body: ComponentType<StepBodyProps>,
): StepTabPiece {
  return {
    key,
    name,
    count: (context) => context.relations.filter((r) => relationGroup(r) === group).length,
    start(id, step, context) {
      if (step?.kind !== 'RELATION') return emptyRelation(id)
      const t = templateOf(step, context)
      return t && relationGroup(t) === group ? step : emptyRelation(id)
    },
    Body,
  }
}

export const getTab = relationTab('GET', 'GET Relation', 'read', ReadRelationBody)
export const putTab = relationTab('PUT', 'PUT Relation', 'write', WriteRelationBody)
