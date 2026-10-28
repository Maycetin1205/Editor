import { Checkbox } from '../widgets/Checkbox'
import { Choice, type ChoiceOption } from '../widgets/Choice'
import { cn } from '../widgets/cn'
import { Field } from '../widgets/Field'
import { NAME, SETTINGS, Strip } from '../widgets/Grid'
import { Segment } from '../widgets/Segment'
import type { DataSource } from '../../core/data/dataSources'
import { newSplit, SPLIT_HIDE_MAX, SPLIT_SORT_MAX } from '../../core/data/split'
import type { SplitDraft } from './splitDraft'

const DIRECTIONS = [
  { value: 'up', name: 'Aufsteigend' },
  { value: 'down', name: 'Absteigend' },
]

interface SplitSettingsProps {
  edit: SplitDraft
  helpers: readonly DataSource[]
  columns: readonly ChoiceOption[]
  fields: readonly ChoiceOption[]
}

function SplitSourceLines({ edit, helpers, columns, fields }: SplitSettingsProps) {
  const { draft, set } = edit
  return (
    <div className={cn(SETTINGS, 'grid-cols-[112px_minmax(0,1fr)]')}>
      <span className={NAME}>Verteilen auf</span>
      <Choice
        aria-label="Verteilen auf"
        options={helpers.map((s) => ({ value: s.id, name: s.name }))}
        emptyText={helpers.length === 0 ? 'Erst eine Hilfsquelle anlegen' : undefined}
        value={draft.sourceId}
        onChoose={(sourceId) => edit.restart({ ...newSplit(sourceId), amountColumn: draft.amountColumn })}
      />
      <span className={NAME}>Menge aus</span>
      <Choice
        aria-label="Menge aus Spalte"
        options={columns}
        emptyText="Spalte wählen"
        value={draft.amountColumn}
        onChoose={(amountColumn) => set({ amountColumn })}
      />
      <span className={NAME}>Bestand</span>
      <Choice
        aria-label="Bestand"
        options={fields}
        emptyText="Ohne"
        value={draft.stockField}
        onChoose={(stockField) => set({ stockField, ...(stockField === '' ? { hideEmpty: false } : {}) })}
      />
    </div>
  )
}

// One line more than there are sort fields, up to the most allowed.
function SplitSortLines({ edit, fields }: Pick<SplitSettingsProps, 'edit' | 'fields'>) {
  const { draft, setSort } = edit
  const lines = Math.min(SPLIT_SORT_MAX, draft.sort.length + 1)
  return (
    <div className={cn(SETTINGS, 'grid-cols-[112px_minmax(0,1fr)]')}>
      {Array.from({ length: lines }, (_, at) => {
        const sort = draft.sort[at]
        return [
          <span key={`n${at}`} className={NAME}>
            {at === 0 ? 'Zuerst nach' : 'Dann nach'}
          </span>,
          <Choice
            key={`f${at}`}
            aria-label={at === 0 ? 'Zuerst sortieren nach' : 'Dann sortieren nach'}
            options={fields}
            emptyText="Wie geliefert"
            value={sort?.field ?? ''}
            onChoose={(field) => setSort(at, field === '' ? null : { field, ...(sort?.down ? { down: true } : {}) })}
          />,
          ...(sort === undefined
            ? []
            : [
                <span key={`s${at}`} />,
                <Segment
                  key={`d${at}`}
                  name="Richtung"
                  options={DIRECTIONS}
                  value={sort.down === true ? 'down' : 'up'}
                  onChoose={(v) => setSort(at, { field: sort.field, ...(v === 'down' ? { down: true } : {}) })}
                />,
              ]),
        ]
      })}
    </div>
  )
}

// One line more than there are hiding rules, up to the most allowed.
function SplitHideLines({ edit, fields }: Pick<SplitSettingsProps, 'edit' | 'fields'>) {
  const { draft, set, setHide } = edit
  const lines = Math.min(SPLIT_HIDE_MAX, draft.hide.length + 1)
  return (
    <div className={cn(SETTINGS, 'grid-cols-[88px_minmax(0,1fr)_72px]')}>
      <span className={NAME}>Bestand</span>
      <Checkbox
        className="col-span-2"
        checked={draft.hideEmpty}
        disabled={draft.stockField === ''}
        onChange={() => set({ hideEmpty: !draft.hideEmpty })}
      >
        Ohne Bestand ausblenden
      </Checkbox>
      {Array.from({ length: lines }, (_, at) => {
        const hide = draft.hide[at]
        return [
          <span key={`n${at}`} className={NAME}>
            Wenn Feld
          </span>,
          <Choice
            key={`f${at}`}
            aria-label="Ausblenden, wenn Feld"
            options={fields}
            emptyText="Keins"
            value={hide?.field ?? ''}
            onChoose={(field) => setHide(at, field === '' ? null : { field, value: hide?.value ?? '' })}
          />,
          <Field
            key={`v${at}`}
            aria-label="gleich Wert"
            placeholder="gleich"
            disabled={hide === undefined}
            value={hide?.value ?? ''}
            onChange={(e) => {
              if (hide !== undefined) setHide(at, { field: hide.field, value: e.currentTarget.value })
            }}
          />,
        ]
      })}
    </div>
  )
}

// Where the split takes its rows from, how it sorts them and which it hides.
export function SplitSettings(props: SplitSettingsProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <Strip>Quelle</Strip>
      <SplitSourceLines {...props} />
      <Strip>Sortierung</Strip>
      <SplitSortLines edit={props.edit} fields={props.fields} />
      <Strip>Ausblenden</Strip>
      <SplitHideLines edit={props.edit} fields={props.fields} />
      <p className="px-[12px] py-[10px] text-dense text-muted">
        Bald: ein Datum steht so viele Tage vorher ocker, danach rot. Leer lässt die Spalte, wie sie ist.
      </p>
    </div>
  )
}
