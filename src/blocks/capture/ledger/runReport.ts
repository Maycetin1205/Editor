import type { PendingKind, WrittenRow } from '../../../core/block/capability'
import { inOpenPopup } from '../../../runtime/steps/popup'
import type { CaptureLedger } from '../ledger'

export function runDone(ledger: CaptureLedger, kind: PendingKind, written: readonly WrittenRow[]): void {
  ledger.outbound.done(
    kind,
    written.map((z) => z.key),
  )
  if (kind === 'captured') {
    if (ledger.captured.markWritten(written, inOpenPopup(ledger.host.block))) ledger.host.report()
    return
  }
  ledger.booked.takeOut(written.filter((z) => z.shown !== true).map((z) => z.key))
  ledger.booked.forget(written.filter((z) => z.shown === true).map((z) => z.key))
}

// The rows of the list now carry what was written, so the copies kept until
// then go.
export function writtenArrived(ledger: CaptureLedger): void {
  const { captured, booked } = ledger
  if (!captured.hasWritten() && !booked.hasInFlight()) return
  captured.dropWritten()
  booked.dropInFlight()
  ledger.host.report()
}
