import type { DataSource } from '../../core/data/dataSources'
import type { StepCondition } from '../../core/data/steps/stepAdapter'

export function conditionWords(condition: StepCondition | undefined, sources: readonly DataSource[]): string {
  if (condition === undefined) return ''
  const name = sources.find((s) => s.id === condition.sourceId)?.name ?? condition.sourceId
  return `nur wenn ${name} ${condition.rows ? 'Zeilen hat' : 'keine Zeilen hat'}`
}
