import { NAME, Strip } from '@/editor/widgets/Grid'
import { Segment } from '@/editor/widgets/Segment'
import { PickerControl } from '../controls/PickerControl'
import type { StepBodyProps } from './stepPiece'

export function PopupBody({ step, context, onChange }: StepBodyProps) {
  if (step.kind !== 'POPUP_OPEN' && step.kind !== 'POPUP_CLOSE') return null
  const choose = (kind: string): void => {
    onChange({ ...step, kind: kind === 'POPUP_CLOSE' ? 'POPUP_CLOSE' : 'POPUP_OPEN' })
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Strip>Popup</Strip>
      <div className="grid grid-cols-[112px_260px] items-center gap-[8px] px-[12px] py-[8px]">
        <span className={NAME}>Aktion</span>
        <Segment
          name="Aktion"
          options={[
            { value: 'POPUP_OPEN', name: 'öffnen' },
            { value: 'POPUP_CLOSE', name: 'schließen' },
          ]}
          value={step.kind}
          onChoose={choose}
        />
        <span className={NAME}>Popup</span>
        <PickerControl
          name="Popup"
          className="w-full"
          groups={[{ key: 'popups', entries: context.popups }]}
          value={step.popupId}
          onChoose={(id) => onChange({ ...step, popupId: id })}
        />
      </div>
    </div>
  )
}
