import {
  liftTo21,
  liftTo22,
  liftTo23,
  liftTo24,
  liftTo25,
  liftTo26,
  liftTo27,
  liftTo28,
  liftTo29,
  liftTo30,
} from './lifts/lift21to30'
import {
  liftTo31,
  liftTo32,
  liftTo33,
  liftTo34,
  liftTo35,
  liftTo36,
  liftTo37,
  liftTo38,
  liftTo39,
} from './lifts/lift31to39'
import { isPlainObject } from './lifts/plain'

export const CURRENT_SCHEMA_VERSION = 39

const LIFTABLE = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38]

export function liftState(raw: unknown, knownSources: readonly unknown[] = []): Record<string, unknown> | null {
  if (!isPlainObject(raw) || typeof raw.schemaVersion !== 'number') return null
  if (raw.schemaVersion !== CURRENT_SCHEMA_VERSION && !LIFTABLE.includes(raw.schemaVersion)) return null
  const lifted = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
  if (raw.schemaVersion < 21) liftTo21(lifted.tree)
  if (raw.schemaVersion < 22) liftTo22(lifted.tree)
  if (raw.schemaVersion < 23) liftTo23(lifted.tree)
  if (raw.schemaVersion < 24) liftTo24(lifted.tree)
  if (raw.schemaVersion < 25) liftTo25(lifted.tree)
  if (raw.schemaVersion < 26) liftTo26(lifted.tree)
  if (raw.schemaVersion < 27) liftTo27(lifted.tree)
  if (raw.schemaVersion < 28) liftTo28(lifted.tree)
  if (raw.schemaVersion < 29) liftTo29(lifted.tree)
  if (raw.schemaVersion < 30) liftTo30(lifted.tree)
  if (raw.schemaVersion < 31) liftTo31(lifted.tree)
  if (raw.schemaVersion < 32) liftTo32(lifted.tree)
  if (raw.schemaVersion < 33) liftTo33(lifted.tree)
  if (raw.schemaVersion < 34) liftTo34(lifted.tree)
  if (raw.schemaVersion < 35) liftTo35(lifted.tree)
  if (raw.schemaVersion < 36) liftTo36(lifted.tree)
  if (raw.schemaVersion < 37) {
    liftTo37(lifted.tree, [...(Array.isArray(lifted.dataSources) ? lifted.dataSources : []), ...knownSources])
  }
  if (raw.schemaVersion < 38) liftTo38(lifted.tree)
  if (raw.schemaVersion < 39) liftTo39(lifted.tree)
  lifted.schemaVersion = CURRENT_SCHEMA_VERSION
  return lifted
}
