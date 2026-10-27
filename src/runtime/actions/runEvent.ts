import type { ValueCarrier } from '../../core/block/capability'
import { contractOf, readActionValue } from '../../core/block/registry'
import type { PlaceholderValues } from '../../core/data/relations'
import { chainsRead } from '../../core/data/steps/chainsRead'
import { stepAdapter, type RuntimeStep } from '../../core/data/steps/steps'
import { warn } from '../log'
import { actionEnded, actionStarted } from '../notice'
import type { ActionResult } from './actionResult'
import { searchCarrier } from './carrier'
import { runSections } from './runSections'

export type { ActionResult } from './actionResult'
export { searchCarrier } from './carrier'

// One run per block and event at a time: a second click while the first
// chain runs is "busy", not a second chain.
const running = new WeakMap<HTMLElement, Set<string>>()

function emptyRequired(
  root: ParentNode,
  steps: readonly RuntimeStep[],
): { field: ValueCarrier; prop: string } | undefined {
  for (const step of steps) {
    for (const binding of stepAdapter(step.kind).bindings(step)) {
      if (binding.source !== 'blockValue') continue
      const el = searchCarrier(root, binding.blockId ?? '')
      const field = el && contractOf(el, 'actionValue')
      if (!el || !field?.valueRequired(binding.value)) continue
      if (readActionValue(el, binding.value).trim() === '') return { field, prop: binding.value }
    }
  }
  return undefined
}

export async function runEvent(
  el: HTMLElement,
  eventKey: string,
  context: PlaceholderValues,
  lockKey: string = eventKey,
): Promise<ActionResult> {
  try {
    return await runChain(el, eventKey, context, lockKey)
  } catch (error) {
    warn(`Aktion "${eventKey}" nicht gestartet`, error)
    return { state: 'failed', written: false }
  }
}

async function runChain(
  el: HTMLElement,
  eventKey: string,
  context: PlaceholderValues,
  lockKey: string,
): Promise<ActionResult> {
  const steps = chainsRead(el.getAttribute('data-ff-actions'))[eventKey]
  if (!steps || steps.length === 0) return { state: 'ran', written: false }

  const missing = emptyRequired(el.ownerDocument ?? document, steps)
  if (missing) {
    missing.field.focusValue(missing.prop)
    return { state: 'cancelled', written: false }
  }

  let locks = running.get(el)
  if (!locks) {
    locks = new Set()
    running.set(el, locks)
  }
  if (locks.has(lockKey)) return { state: 'busy', written: false }
  locks.add(lockKey)
  actionStarted(el)
  let result: ActionResult = { state: 'failed', written: false }
  try {
    result = await runSections(el, eventKey, steps, context)
  } finally {
    locks.delete(lockKey)
    actionEnded(el, result)
  }
  return result
}
