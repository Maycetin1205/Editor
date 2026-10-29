import { Field } from '@/editor/widgets/Field'
import { NAME, Strip } from '@/editor/widgets/Grid'
import type { RelationTemplate } from '../../core/data/relations'
import type { RelationStep } from '../../core/data/steps/relation'
import { fieldLength, spreadFits, SPREAD_ROWS_MAX, type PickSpread } from '../../core/data/steps/spread'
import { PickerControl } from '../controls/PickerControl'
import type { ReachGroup } from '../origin/reach'

const NONE = ''
const SEP = '::'
const MARK_DEFAULT = 'CHANR'

function withoutSpread(step: RelationStep): RelationStep {
  const plain = { ...step }
  delete plain.spread
  return plain
}

// The distributed rows of a capture, carried in the free fields of the
// record the relation writes (see PickSpread).
export function SpreadPart({
  template,
  step,
  splits,
  onChange,
}: {
  template: RelationTemplate
  step: RelationStep
  splits: readonly ReachGroup[]
  onChange: (step: RelationStep) => void
}) {
  if (!spreadFits(template) || splits.length === 0) return null
  const spread = step.spread
  const set = (change: Partial<PickSpread>) => spread && onChange({ ...step, spread: { ...spread, ...change } })
  const choose = (value: string) => {
    if (value === NONE) {
      onChange(withoutSpread(step))
      return
    }
    const [blockId = '', field = ''] = value.split(SEP)
    const mark = template.parameter.includes(MARK_DEFAULT) ? MARK_DEFAULT : ''
    onChange({ ...step, spread: { start: 0, rows: SPREAD_ROWS_MAX, mark, ...spread, blockId, field } })
  }
  const number = (text: string) => (/^\d+$/.test(text) ? Number(text) : 0)

  return (
    <>
      <Strip>Verteilte Zeilen</Strip>
      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-[8px] gap-y-[6px] px-[12px] py-[9px]">
        <span className={NAME}>Wert</span>
        <PickerControl
          name="Verteilte Zeilen"
          className="w-full"
          wrap
          groups={[
            { key: 'none', entries: [{ value: NONE, name: 'Nicht mitschicken' }] },
            ...splits.map((g) => ({
              key: g.id,
              name: g.name,
              entries: g.entries
                .filter((e) => fieldLength(e.value) > 0)
                .map((e) => ({ value: `${g.id}${SEP}${e.value}`, name: e.name })),
            })),
          ]}
          value={spread ? `${spread.blockId}${SEP}${spread.field}` : NONE}
          onChoose={choose}
        />
        {spread && (
          <>
            <span className={NAME}>Ab Feld</span>
            <Field
              aria-label="Ab Feld"
              inputMode="numeric"
              value={spread.start === 0 ? '' : String(spread.start)}
              onChange={(e) => set({ start: number(e.currentTarget.value) })}
            />
            <span className={NAME}>Höchstens</span>
            <Field
              aria-label="Höchstens"
              type="number"
              min={1}
              max={SPREAD_ROWS_MAX}
              value={String(spread.rows)}
              onChange={(e) => set({ rows: Math.min(SPREAD_ROWS_MAX, Math.max(1, number(e.currentTarget.value))) })}
            />
            <span className={NAME}>J/N in</span>
            <PickerControl
              name="J/N in"
              className="w-full"
              groups={[
                { key: 'none', entries: [{ value: '', name: 'Keine Stelle' }] },
                { key: 'places', entries: template.parameter.map((p) => ({ value: p, name: p })) },
              ]}
              value={spread.mark}
              onChoose={(mark) => set({ mark })}
            />
          </>
        )}
      </div>
    </>
  )
}
