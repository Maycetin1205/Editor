import { Strip } from '../widgets/Grid'
import type { StepBodyProps } from './stepTypes'

export function ConfirmBody({ step }: StepBodyProps) {
  if (step.kind !== 'CONFIRM') return null
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Strip>Rückfrage</Strip>
      <p className="px-[12px] py-[8px] text-muted">
        Die Zeile wird rot, darunter fragt ein kleines Fenster: Löschen oder Abbrechen. Abbrechen hält die Kette hier
        an.
      </p>
    </div>
  )
}
