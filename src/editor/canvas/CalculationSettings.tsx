import { cn } from '../widgets/cn'
import { Field } from '../widgets/Field'
import { NAME, SETTINGS, Strip } from '../widgets/Grid'
import { Segment } from '../widgets/Segment'
import { DECIMALS_MAX } from '../../core/data/calculation'
import { sentenceText, type Names } from './calculationWords'
import type { CalculationDraft } from './useCalculationDraft'
import { UnitsPane } from './UnitsPane'

// The right side of the calculation window: the result as a sentence, the
// kind of sum, the rounding, and the table of the units term.
export function CalculationSettings({ d, names }: { d: CalculationDraft; names: Names }) {
  const { draft, setDraft } = d
  const units = d.terms[d.unitsAt]
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <Strip>Ergebnis</Strip>
      <div className="break-words border-b border-line-soft px-[12px] py-[9px] font-mono text-dense leading-[19px] text-ink">
        {sentenceText(d.finished, names)}
      </div>
      <Strip>Rechnung</Strip>
      <div className={cn(SETTINGS, 'grid-cols-[112px_auto]')}>
        <span className={NAME}>Zeichen</span>
        <Segment
          name="Rechnung"
          options={[
            { value: 'times', name: '× ÷' },
            { value: 'adds', name: '+ −' },
          ]}
          value={draft.adds === true ? 'adds' : 'times'}
          onChoose={(v) =>
            setDraft({
              key: draft.key,
              lead: draft.lead,
              terms: draft.terms,
              decimals: draft.decimals,
              ...(v === 'adds' ? { adds: true } : {}),
            })
          }
        />
      </div>
      <Strip>Rundung</Strip>
      <div className={cn(SETTINGS, 'grid-cols-[112px_72px]')}>
        <span className={NAME}>Stellen</span>
        <Field
          aria-label="Stellen"
          inputMode="numeric"
          value={draft.decimals}
          onChange={(e) => {
            const decimals = Number.parseInt(e.currentTarget.value, 10)
            if (Number.isInteger(decimals) && decimals >= 0 && decimals <= DECIMALS_MAX) {
              setDraft({ ...draft, decimals })
            }
          }}
          className="text-right font-mono"
        />
      </div>
      {units?.kind === 'units' && (
        <UnitsPane term={units} names={names} onChange={(next) => d.setTerm(d.unitsAt, next)} />
      )}
    </div>
  )
}
