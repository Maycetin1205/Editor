import type { PendingKind } from '../../block/capability'
import { CELLS_PARAM_SOURCES } from '../actions'
import { isUnread } from '../../unread'
import { conditionRead } from './stepAdapter'
import { isStepKind, stepAdapter, type RuntimeStep, type Step } from './steps'

function parsedChains(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isUnread<Record<string, unknown>>(parsed) ? parsed : null
  } catch {
    return null
  }
}

// A chain with one step it cannot read is no chain at all.
function chainRead(chain: readonly unknown[]): RuntimeStep[] | null {
  const steps: RuntimeStep[] = []
  for (const entry of chain) {
    const step =
      isUnread<RuntimeStep>(entry) &&
      typeof entry.kind === 'string' &&
      isStepKind(entry.kind) &&
      typeof entry.resultName === 'string'
        ? stepAdapter(entry.kind).readExported(entry, entry.resultName)
        : null
    if (!step) return null
    steps.push({ ...step, ...(isUnread<RuntimeStep>(entry) ? conditionRead(entry.onlyIf) : {}) })
  }
  return steps
}

// The action chains as the exported mask carries them in data-ff-actions.
export function chainsRead(raw: string | null): Record<string, RuntimeStep[]> {
  const out: Record<string, RuntimeStep[]> = {}
  for (const [key, chain] of Object.entries(parsedChains(raw) ?? {})) {
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps = chainRead(chain)
    if (steps) out[key] = steps
  }
  return out
}

// The events whose chain the runtime would drop: the mask stays silent there.
export function unreadChains(raw: string): string[] {
  const parsed = parsedChains(raw)
  if (!parsed) return ['*']
  return Object.entries(parsed)
    .filter(([, chain]) => !Array.isArray(chain) || (chain.length > 0 && chainRead(chain) === null))
    .map(([key]) => key)
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
