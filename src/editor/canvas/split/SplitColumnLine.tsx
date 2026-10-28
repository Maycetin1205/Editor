import { ChevronDown, ChevronUp, Trash2 } from '../../icons/icon'
import { Button } from '../../widgets/Button'
import { Choice, type ChoiceOption } from '../../widgets/Choice'
import { cn } from '../../widgets/cn'
import { INPUT, TD } from '../../widgets/Grid'
import { SOON_DAYS_MAX, type SplitColumn } from '../../../core/data/split'
import { wholeOrNone } from './splitDraft'

interface WholeCellProps {
  label: string
  placeholder: string
  value: number | undefined
  max: number
  // Nothing when the cell is empty or holds no whole number up to `max`.
  onValue: (value: number | undefined) => void
}

function WholeCell({ label, placeholder, value, max, onValue }: WholeCellProps) {
  return (
    <td className={TD}>
      <input
        aria-label={label}
        inputMode="numeric"
        placeholder={placeholder}
        className={cn(INPUT, 'text-right font-mono')}
        value={value ?? ''}
        onChange={(e) => onValue(wholeOrNone(e.currentTarget.value, max))}
      />
    </td>
  )
}

function LineButtons({
  at,
  last,
  onMove,
  onRemove,
}: Pick<SplitColumnLineProps, 'at' | 'last' | 'onMove' | 'onRemove'>) {
  return (
    <td className={cn(TD, 'px-[4px]')}>
      <span className="flex items-center justify-end gap-[2px]">
        <Button onlyIcon aria-label="Nach oben" disabled={at === 0} onClick={() => onMove(-1)}>
          <ChevronUp size={14} aria-hidden />
        </Button>
        <Button onlyIcon aria-label="Nach unten" disabled={last} onClick={() => onMove(1)}>
          <ChevronDown size={14} aria-hidden />
        </Button>
        <Button onlyIcon aria-label="Spalte entfernen" onClick={onRemove}>
          <Trash2 size={14} aria-hidden />
        </Button>
      </span>
    </td>
  )
}

interface SplitColumnLineProps {
  column: SplitColumn
  at: number
  last: boolean
  fields: readonly ChoiceOption[]
  fieldName: (code: string) => string
  onChange: (column: SplitColumn) => void
  onMove: (step: -1 | 1) => void
  onRemove: () => void
}

// One column of the split list: field, heading, width and the days of "soon".
export function SplitColumnLine({
  column,
  at,
  last,
  fields,
  fieldName,
  onChange,
  onMove,
  onRemove,
}: SplitColumnLineProps) {
  // Without a value of its own the key is left out, so the saved column stays as it was.
  const without = (key: 'width' | 'soonDays'): SplitColumn => {
    const next = { ...column }
    delete next[key]
    return next
  }
  return (
    <tr>
      <td className={cn(TD, 'px-[10px] text-right font-mono text-dense text-muted')}>{at + 1}</td>
      <td className={cn(TD, 'px-[4px]')}>
        <Choice
          aria-label={`Feld der Spalte ${at + 1}`}
          options={fields}
          value={column.field}
          onChoose={(field) =>
            onChange({
              ...column,
              field,
              // A heading nobody typed follows the field.
              ...(column.title === '' || column.title === fieldName(column.field) ? { title: fieldName(field) } : {}),
            })
          }
        />
      </td>
      <td className={TD}>
        <input
          aria-label={`Überschrift der Spalte ${at + 1}`}
          className={INPUT}
          value={column.title}
          onChange={(e) => onChange({ ...column, title: e.currentTarget.value })}
        />
      </td>
      <WholeCell
        label={`Breite der Spalte ${at + 1}`}
        placeholder="auto"
        value={column.width}
        max={999}
        onValue={(width) => onChange(width ? { ...without('width'), width } : without('width'))}
      />
      <WholeCell
        label={`Bald: Tage vorher, Spalte ${at + 1}`}
        placeholder="aus"
        value={column.soonDays}
        max={SOON_DAYS_MAX}
        onValue={(soonDays) =>
          onChange(soonDays === undefined ? without('soonDays') : { ...without('soonDays'), soonDays })
        }
      />
      <LineButtons at={at} last={last} onMove={onMove} onRemove={onRemove} />
    </tr>
  )
}
