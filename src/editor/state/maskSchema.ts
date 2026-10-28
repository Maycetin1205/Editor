export const CURRENT_SCHEMA_VERSION = 41

// The oldest stage this editor still lifts; maskFile.ts names older ones as
// too old.
const OLDEST_STAGE = 39

type Values = Record<string, unknown>

function isPlainObject(value: unknown): value is Values {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nodesOf(tree: unknown): Values[] {
  return isPlainObject(tree) ? Object.values(tree).filter(isPlainObject) : []
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
  for (const node of nodesOf(tree)) {
    if (node.type !== 'area' || !isPlainObject(node.values)) continue
    const values = node.values
    if (typeof values.kind === 'string') continue
    const appearance = typeof values.appearance === 'string' ? values.appearance : 'box'
    values.kind = AREA_KINDS_40[appearance] ?? 'headed'
    if (appearance === 'fold') values.foldable = true
    delete values.appearance
  }
}

// Stage 41, 28.10.2026: blocks that went into others. The Trennlinie is a
// Text drawn as a divider, its word the words of the Text.
const TAKEN_OVER_41: Readonly<Record<string, (values: Values) => { type: string; values: Values }>> = {
  divider: ({ word, ...rest }) => ({
    type: 'text',
    values: { ...rest, form: 'divider', text: typeof word === 'string' ? word : '' },
  }),
}

// A node of a type that went into another is taken over wherever it turns
// up, in a mask of this stage too: nothing else reads that type any more.
function liftTo41(tree: unknown): void {
  for (const node of nodesOf(tree)) {
    const take = typeof node.type === 'string' ? TAKEN_OVER_41[node.type] : undefined
    if (!take) continue
    const taken = take(isPlainObject(node.values) ? node.values : {})
    node.type = taken.type
    node.values = taken.values
  }
}

// A copy of the state of a mask written at this stage, or lifted from the
// stages before it down to the oldest one; null for any other.
export function currentState(raw: unknown): Values | null {
  if (!isPlainObject(raw)) return null
  const stage = raw.schemaVersion
  if (typeof stage !== 'number' || !Number.isInteger(stage)) return null
  if (stage < OLDEST_STAGE || stage > CURRENT_SCHEMA_VERSION) return null
  const state = JSON.parse(JSON.stringify(raw)) as Values
  if (stage < 40) liftTo40(state.tree)
  liftTo41(state.tree)
  state.schemaVersion = CURRENT_SCHEMA_VERSION
  return state
}
