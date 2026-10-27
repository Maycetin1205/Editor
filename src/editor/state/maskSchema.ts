export const CURRENT_SCHEMA_VERSION = 40

// The one stage below the current one that is still lifted.
const PREVIOUS_STAGE = 39

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Stage 40, the area of 26.10.2026: its five forms become three kinds and a
// switch for folding.
const AREA_KINDS_40: Readonly<Record<string, string>> = {
  plain: 'plain',
  box: 'card',
  headed: 'headed',
  fold: 'headed',
  band: 'card',
}

// An area that carries a kind already stays as it is: masks of stage 39
// saved by that area carry its settings without its stage.
function liftTo40(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'area' || !isPlainObject(node.values)) continue
    const values = node.values
    if (typeof values.kind === 'string') continue
    const appearance = typeof values.appearance === 'string' ? values.appearance : 'box'
    values.kind = AREA_KINDS_40[appearance] ?? 'headed'
    if (appearance === 'fold') values.foldable = true
    delete values.appearance
  }
}

// A copy of the state of a mask written at this stage, or lifted from the
// stage before; null for any other. Older stages are not lifted: maskFile.ts
// names them as too old.
export function currentState(raw: unknown): Record<string, unknown> | null {
  if (!isPlainObject(raw)) return null
  if (raw.schemaVersion !== CURRENT_SCHEMA_VERSION && raw.schemaVersion !== PREVIOUS_STAGE) return null
  const state = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
  if (state.schemaVersion === PREVIOUS_STAGE) {
    liftTo40(state.tree)
    state.schemaVersion = CURRENT_SCHEMA_VERSION
  }
  return state
}
