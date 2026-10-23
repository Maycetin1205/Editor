import { Field } from '@/editor/widgets/Field'
import { NAME, Strip } from '@/editor/widgets/Grid'
import type { RelationTemplate } from '../../core/data/relations'
import type { StartToolStep } from '../../core/data/steps/startTool'
import { Places } from './Places'
import type { StepBodyProps } from './stepPiece'

function toolTemplate(step: StartToolStep): RelationTemplate {
  return {
    id: 'tool',
    name: 'Tool',
    verb: 'PUT_RELATION',
    nr: step.toolNumber,
    parameter: [],
    extraParameterAllowed: true,
  }
}

export function StartToolBody({ step, reach, onChange }: StepBodyProps) {
  if (step.kind !== 'START_TOOL') return null
  const places = step.parameter.length
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Strip>Tool</Strip>
      <div className="grid grid-cols-[112px_260px] items-center gap-[8px] border-b border-line-soft px-[12px] py-[8px]">
        <span className={NAME}>Nummer</span>
        <Field
          aria-label="Nummer des Tools"
          autoFocus
          inputMode="numeric"
          value={step.toolNumber}
          onChange={(e) => onChange({ ...step, toolNumber: e.currentTarget.value.replace(/[^\d]/g, '') })}
        />
      </div>
      <Strip right={places === 0 ? 'keine' : `${places} ${places === 1 ? 'Stelle' : 'Stellen'}`}>Stellen</Strip>
      <Places
        template={toolTemplate(step)}
        filled={{ parameter: [], extraParameter: step.parameter }}
        reach={reach}
        onChange={(filled) => onChange({ ...step, parameter: [...filled.extraParameter] })}
      />
      <p className="px-[12px] py-[8px] text-muted">
        SoftEngine startet das Tool mit dieser Nummer; die Stellen gehen als Parameter mit. Eine Antwort kommt nicht
        zurück. Die Nummern stehen in SoftEngine unter Werkzeuge.
      </p>
    </div>
  )
}
