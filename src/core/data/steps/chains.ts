import { COLUMN_PARAM_SOURCES } from '../actions'
import type { RelationTemplate } from '../relations'
import { isUnread } from '../../unread'
import { conditionRead, type StepCondition } from './stepAdapter'
import { isStepKind, stepAdapter, type ActionChains, type RuntimeStep, type Step } from './steps'

// The action chains as a mask file holds them. A chain with one unreadable
// step is left out whole: half a chain would do half the work.
export function chainsClean(raw: unknown, allowedEvents: readonly string[]): ActionChains | undefined {
  if (!isUnread<ActionChains>(raw)) return undefined
  const out: ActionChains = {}
  for (const key of allowedEvents) {
    const chain = raw[key]
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: Step[] = []
    const seenIds = new Set<string>()
    let broken = false
    for (const entry of chain) {
      const id = isUnread<Step>(entry) && typeof entry.id === 'string' ? entry.id : ''
      const step =
        isUnread<Step>(entry) &&
        typeof entry.kind === 'string' &&
        isStepKind(entry.kind) &&
        typeof entry.resultName === 'string'
          ? stepAdapter(entry.kind).read(entry, { id, resultName: entry.resultName })
          : null
      if (!step || id === '' || seenIds.has(id)) {
        broken = true
        break
      }
      seenIds.add(id)

      const note = isUnread<Step>(entry) && typeof entry.note === 'string' ? entry.note.trim() : ''
      const condition = isUnread<Step>(entry) ? conditionRead(entry.onlyIf) : {}
      steps.push({ ...step, ...(note !== '' ? { note } : {}), ...condition })
    }
    if (!broken && steps.length > 0) out[key] = steps
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function withCondition(step: Step, onlyIf: StepCondition | undefined): Step {
  if (onlyIf !== undefined) return { ...step, onlyIf }
  if (step.onlyIf === undefined) return step
  const plain = { ...step }
  delete plain.onlyIf
  return plain
}

export function chainsForExport(
  events: ActionChains | undefined,
  eventOrder: readonly string[],

  popupName: (id: string) => string = () => '',

  columnsIndex: (blockId: string, key: string) => string = (_, key) => key,
): string | null {
  if (!events) return null
  const out: Record<string, RuntimeStep[]> = {}
  for (const key of eventOrder) {
    const steps = events[key]
    if (!steps?.length) continue

    const position = new Map(steps.map((s, i) => [s.id, String(i)]))
    const refs = { popupName, stepPosition: (id: string) => position.get(id) ?? '-1', columnsIndex }
    out[key] = steps.map((step) => ({
      ...stepAdapter(step.kind).export(step, refs),
      ...(step.onlyIf === undefined ? {} : { onlyIf: step.onlyIf }),
    }))
  }
  return Object.keys(out).length > 0 ? JSON.stringify(out) : null
}

function stepsBefore(chain: readonly Step[], stepId: string | undefined): readonly Step[] {
  const own = stepId === undefined ? -1 : chain.findIndex((s) => s.id === stepId)
  return own < 0 ? chain : chain.slice(0, own)
}

export interface ResultStep {
  id: string
  nr: number
  name: string

  sourceId?: string
}

export function resultStepsBefore(
  chain: readonly Step[],
  stepId: string | undefined,
  relation: readonly RelationTemplate[] | undefined,
): ResultStep[] {
  const before = stepsBefore(chain, stepId)
  const out: ResultStep[] = []
  for (let i = 0; i < before.length; i++) {
    const s = before[i]
    const adapter = stepAdapter(s.kind)
    const relationId = adapter.relationId(s)
    if (relationId === '') continue
    const rel = relation?.find((r) => r.id === relationId)
    if (!rel) continue
    const bindings = adapter.bindings(s)
    const addsRows = bindings.some((b) => COLUMN_PARAM_SOURCES[b.source] === 'captured')
    if (rel.verb !== 'GET_RELATION' && !addsRows) continue
    const sourceId = bindings.find((b) => b.source === 'dataField' && (b.sourceId ?? '') !== '')?.sourceId
    out.push({
      id: s.id,
      nr: i + 1,
      name: rel.name,
      ...(sourceId === undefined ? {} : { sourceId }),
    })
  }
  return out
}
