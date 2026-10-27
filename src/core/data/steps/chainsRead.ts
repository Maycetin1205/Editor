import type { PendingKind } from '../../block/capability'
import { CELLS_PARAM_SOURCES } from '../actions'
import { isUnread } from '../../unread'
import { conditionRead } from './stepAdapter'
import { isStepKind, stepAdapter, type RuntimeStep, type Step } from './steps'

// The action chains as the exported mask carries them in data-ff-actions.
export function chainsRead(raw: string | null): Record<string, RuntimeStep[]> {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!isUnread<Record<string, RuntimeStep[]>>(parsed)) return {}
  const out: Record<string, RuntimeStep[]> = {}
  for (const [key, chain] of Object.entries(parsed)) {
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: RuntimeStep[] = []
    let broken = false
    for (const entry of chain) {
      const step =
        isUnread<RuntimeStep>(entry) &&
        typeof entry.kind === 'string' &&
        isStepKind(entry.kind) &&
        typeof entry.resultName === 'string'
          ? stepAdapter(entry.kind).readExported(entry, entry.resultName)
          : null
      if (!step) {
        broken = true
        break
      }
      steps.push({ ...step, ...(isUnread<RuntimeStep>(entry) ? conditionRead(entry.onlyIf) : {}) })
    }
    if (!broken && steps.length > 0) out[key] = steps
  }
  return out
}

interface RowsReference {
  kind: PendingKind

  blockId: string
}

function rowsReferenceOf(step: Step | RuntimeStep): RowsReference | null {
  let hit: RowsReference | null = null
  for (const binding of stepAdapter(step.kind).bindings(step)) {
    const kind = CELLS_PARAM_SOURCES[binding.source]
    const blockId = binding.blockId ?? ''
    if (kind === undefined || blockId === '') continue
    if (hit && (hit.kind !== kind || hit.blockId !== blockId)) {
      return { kind, blockId: '' }
    }
    hit = { kind, blockId }
  }
  return hit
}

interface Section {
  kind: 'once' | PendingKind

  blockId: string

  slots: Set<number>
}

// A chain runs in sections: steps that read the rows of one list run once
// per row of that list, the others run once.
export function sectionsOf(steps: readonly (Step | RuntimeStep)[]): Section[] {
  const out: Section[] = []
  for (const [slot, step] of steps.entries()) {
    const reference = rowsReferenceOf(step)
    const last = out[out.length - 1]
    if (reference === null) {
      if (last) last.slots.add(slot)
      else out.push({ kind: 'once', blockId: '', slots: new Set([slot]) })
      continue
    }
    if (last && last.kind === reference.kind && last.blockId === reference.blockId) {
      last.slots.add(slot)
      continue
    }
    out.push({ kind: reference.kind, blockId: reference.blockId, slots: new Set([slot]) })
  }
  return out
}
