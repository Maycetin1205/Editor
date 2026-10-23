import { freshDataRequest, hasSeData, hostConsoleLog, onSeData, startSe } from '../softengine/bridge'
import { sendStartTool } from '../softengine/commands'
import { announceEditing } from '../softengine/editing'
import { fieldRead, fieldWrite } from '../softengine/data'
import { fetchRows } from '../softengine/fetchRows'
import { parameterResolve, relationRun, runtimeRelation, watchConnection, watchQueue } from '../softengine/relations'
import { rowsOfSource, runtimeSource, runtimeSources } from '../softengine/runtimeSources'
import { wireWarning } from '../softengine/warning'
import { closeConnectionLost, showConnectionLost } from './infoBar'
import { exposeJobLog, noteJob, printEndedJobs } from './jobs'
import { warn } from './log'
import type { MaskHost } from './maskHost'

wireWarning(warn)

const wiring = { jobs: false }

const DEBUG_KEY = 'ff-debug'

// Switched on with #ff-debug in the address or localStorage "ff-debug" = "1":
// SoftEngine logs every message, the mask every question it ended.
function debugWanted(): boolean {
  try {
    return location.hash.includes(DEBUG_KEY) || localStorage.getItem(DEBUG_KEY) === '1'
  } catch {
    return false
  }
}

function watchJobs(): void {
  if (wiring.jobs) return
  wiring.jobs = true
  watchQueue(noteJob)
  watchConnection((lost) => {
    if (lost) showConnectionLost()
    else closeConnectionLost()
  })
  exposeJobLog()
  if (!debugWanted()) return
  hostConsoleLog(true)
  printEndedJobs()
}

export const softEngineHost: MaskHost = {
  start: () => { startSe(); announceEditing(); watchJobs() },
  hasData: hasSeData,
  onData: onSeData,

  sources: runtimeSources,
  source: runtimeSource,
  rows: rowsOfSource,
  readField: fieldRead,
  writeField: fieldWrite,

  relation: runtimeRelation,
  resolveParameter: parameterResolve,
  runRelation: relationRun,
  startTool: sendStartTool,
  requestFreshData: freshDataRequest,

  fetchRows,
}
