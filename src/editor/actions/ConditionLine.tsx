import { cn } from '@/editor/widgets/cn'
import { NAME } from '@/editor/widgets/Grid'
import { Segment } from '@/editor/widgets/Segment'
import type { DataSource } from '../../core/data/dataSources'
import type { StepCondition } from '../../core/data/steps/stepAdapter'
import { PickerControl } from '../controls/PickerControl'

const ALWAYS = ''

export function ConditionLine({
  condition,
  sources,
  onChange,
}: {
  condition: StepCondition | undefined
  sources: readonly DataSource[]
  onChange: (condition: StepCondition | undefined) => void
}) {
  return (
    <div className="mr-auto flex min-w-0 items-center gap-[8px]">
      <span className={cn(NAME, 'shrink-0')}>Nur wenn</span>
      <PickerControl
        name="Nur wenn"
        className="h-control w-auto"
        wrap
        groups={[
          { key: 'always', entries: [{ value: ALWAYS, name: 'Immer' }] },
          { key: 'sources', name: 'Quelle', entries: sources.map((s) => ({ value: s.id, name: s.name })) },
        ]}
        value={condition?.sourceId ?? ALWAYS}
        onChoose={(sourceId) => onChange(sourceId === ALWAYS ? undefined : { sourceId, rows: condition?.rows ?? true })}
      />
      {condition !== undefined && (
        <Segment
          name="Zeilen"
          options={[
            { value: 'rows', name: 'Zeilen hat' },
            { value: 'none', name: 'keine Zeilen hat' },
          ]}
          value={condition.rows ? 'rows' : 'none'}
          onChoose={(v) => onChange({ ...condition, rows: v === 'rows' })}
        />
      )}
    </div>
  )
}
