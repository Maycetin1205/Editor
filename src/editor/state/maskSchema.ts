export const CURRENT_SCHEMA_VERSION = 39

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// A copy of the state of a mask written at this stage; null for any other.
// Older stages are not lifted: maskFile.ts names them as too old.
export function currentState(raw: unknown): Record<string, unknown> | null {
  if (!isPlainObject(raw) || raw.schemaVersion !== CURRENT_SCHEMA_VERSION) return null
  return JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
}
