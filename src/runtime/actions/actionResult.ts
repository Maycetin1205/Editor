import type { JobReason } from '../../core/data/jobs'

export type RunState = 'ran' | 'busy' | 'cancelled' | 'failed' | 'unconfirmed'

export interface ActionResult {
  state: RunState
  written: boolean
  reason?: JobReason
  // A write SoftEngine refused or that never went out: what the mask shows
  // for it is not what SoftEngine holds.
  writeFailed?: boolean
}
