import type { Calculation } from '../../core/data/calculation'
import type { Split } from '../../core/data/split'
import type { RowLayout } from '../parts/cell'
import type { CaptureColumn } from './column'
import { BookedRows } from './ledger/bookedRows'
import { CapturedRows } from './ledger/capturedRows'
import { Outbound } from './ledger/outbound'
import { createCaptureRow, type CaptureRow } from './row/captureRow'
import { captureContext, type CaptureContext } from './row/context'
import { firstCell } from './row/typing'

interface LedgerHost {
  block: HTMLElement

  columns: () => readonly CaptureColumn[]

  layout: () => RowLayout

  calculations: () => readonly Calculation[]

  sourceId: () => string

  rawRows: () => readonly unknown[]

  dataRows: () => readonly string[][]

  report: () => void

  focusCell: (index: number) => void

  captured: () => void

  rowAdded: () => void

  split: () => Split | undefined

  splitOpened: () => void
}

// The rows the capture block keeps: the typing row, the rows captured from
// it and not yet booked, the changes to booked rows, and which of them are on
// their way out. ledger/moves.ts and ledger/runReport.ts move rows between
// the parts.
export interface CaptureLedger {
  readonly host: LedgerHost

  readonly row: CaptureRow

  readonly captured: CapturedRows

  readonly booked: BookedRows

  readonly outbound: Outbound
}

export function createLedger(host: LedgerHost): CaptureLedger {
  const context = (): CaptureContext =>
    captureContext(host.block, host.columns(), host.sourceId(), host.calculations(), host.split())
  const outbound = new Outbound(host.report)
  const status = outbound.shows.bind(outbound)
  const row = createCaptureRow({ ...host, context })
  const captured = new CapturedRows({ ...host, context }, row, status)
  const booked = new BookedRows({ ...host, firstCell: () => firstCell(row) }, status)
  return { host, row, captured, booked, outbound }
}
