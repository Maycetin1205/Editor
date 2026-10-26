import type { ChoiceOption } from '@/editor/widgets/Choice'
import { Grid, GridAddLine, Strip } from '@/editor/widgets/Grid'
import type { SplitColumn } from '../../core/data/split'
import { SplitColumnLine } from './SplitColumnLine'
import { moved, type SplitDraft } from './splitDraft'

const COLUMNS = [
  { name: 'Nr.', width: 44, right: true },
  { name: 'Feld' },
  { name: 'Überschrift' },
  { name: 'Breite', width: 76, right: true },
  { name: 'Bald, Tage vorher', width: 132, right: true },
  { name: '', width: 92 },
]

// A new column takes the first field no column shows yet, under a free key.
function addedColumn(columns: readonly SplitColumn[], fields: readonly ChoiceOption[]): SplitColumn {
  const free = fields.find((f) => !columns.some((c) => c.field === f.value)) ?? fields[0]
  const used = new Set(columns.map((c) => c.key))
  let n = columns.length + 1
  while (used.has(`split-${n}`)) n++
  return { key: `split-${n}`, title: free.name, field: free.value }
}

interface SplitColumnsProps {
  edit: SplitDraft
  fields: readonly ChoiceOption[]
  fieldName: (code: string) => string
}

// The columns of the list the split shows, in their order.
export function SplitColumns({ edit, fields, fieldName }: SplitColumnsProps) {
  const columns = edit.draft.columns
  return (
    <div className="flex min-h-0 flex-col border-r border-line-soft">
      <Strip right={columns.length === 1 ? '1 Spalte' : `${columns.length} Spalten`}>Spalten der Liste</Strip>
      <Grid columns={COLUMNS}>
        {columns.map((column, at) => (
          <SplitColumnLine
            key={column.key}
            column={column}
            at={at}
            last={at === columns.length - 1}
            fields={fields}
            fieldName={fieldName}
            onChange={(next) => edit.set({ columns: columns.map((c, k) => (k === at ? next : c)) })}
            onMove={(step) => edit.set({ columns: moved(columns, at, step) })}
            onRemove={() => edit.set({ columns: columns.filter((_, k) => k !== at) })}
          />
        ))}
        {fields.length > 0 && (
          <GridAddLine onAdd={() => edit.set({ columns: [...columns, addedColumn(columns, fields)] })}>
            Spalte hinzufügen
          </GridAddLine>
        )}
      </Grid>
    </div>
  )
}
