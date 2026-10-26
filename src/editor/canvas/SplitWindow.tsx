import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Checkbox } from '@/editor/widgets/Checkbox'
import { Choice, type ChoiceOption } from '@/editor/widgets/Choice'
import { cn } from '@/editor/widgets/cn'
import { Field } from '@/editor/widgets/Field'
import { Grid, GridAddLine, INPUT, NAME, SETTINGS, Strip, TD } from '@/editor/widgets/Grid'
import { Segment } from '@/editor/widgets/Segment'
import { Window } from '@/editor/widgets/Window'
import { blockName } from '../../core/block/blockName'
import { declaredValue } from '../../core/block/registry'
import type { DataSource } from '../../core/data/dataSources'
import { extraSourcesProperty } from '../../core/data/extraSources'
import {
  newSplit,
  SOON_DAYS_MAX,
  SPLIT_HIDE_MAX,
  SPLIT_SORT_MAX,
  SPLITS_PROP,
  splitsProperty,
  type Split,
  type SplitColumn,
  type SplitHide,
  type SplitSort,
} from '../../core/data/split'
import { columnEntries } from '../origin/reach'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { carriesSplit } from './splitWords'

const COLUMNS = [
  { name: 'Nr.', width: 44, right: true },
  { name: 'Feld' },
  { name: 'Überschrift' },
  { name: 'Breite', width: 76, right: true },
  { name: 'Bald, Tage vorher', width: 132, right: true },
  { name: '', width: 92 },
]

const DIRECTIONS = [
  { value: 'up', name: 'Aufsteigend' },
  { value: 'down', name: 'Absteigend' },
]

export function OpenSplitWindow() {
  const ed = useEditor()
  const blockId = useView().splitWindow
  const library = useDataSources().list
  if (blockId === null) return null
  const block = ed.tree[blockId]
  if (block === undefined || !carriesSplit(block)) return null

  const helpers = declaredValue(block, extraSourcesProperty).flatMap((e) => library.filter((s) => s.id === e.sourceId))
  const present = declaredValue(block, splitsProperty)[0]
  const close = (): void => ed.view.openSplit(null)

  return (
    <SplitWindow
      key={blockId}
      title={`Verteilen: ${blockName(block, library)}`}
      split={present ?? newSplit(helpers[0]?.id ?? '')}
      helpers={helpers}
      columns={columnEntries(block)}
      onApply={(next) => {
        ed.updateProperty(block.id, SPLITS_PROP, [next])
        close()
      }}
      onRemove={
        present === undefined
          ? undefined
          : () => {
              ed.updateProperty(block.id, SPLITS_PROP, [])
              close()
            }
      }
      onClose={close}
    />
  )
}

function moved<T>(list: readonly T[], at: number, step: -1 | 1): T[] {
  const to = at + step
  if (to < 0 || to >= list.length) return [...list]
  const next = [...list]
  ;[next[at], next[to]] = [next[to], next[at]]
  return next
}

function wholeOrNone(text: string, max: number): number | undefined {
  const n = Number.parseInt(text, 10)
  return Number.isInteger(n) && n >= 0 && n <= max ? n : undefined
}

function SplitWindow({
  title,
  split,
  helpers,
  columns,
  onApply,
  onRemove,
  onClose,
}: {
  title: string
  split: Split
  helpers: readonly DataSource[]
  columns: readonly { value: string; name: string }[]
  onApply: (split: Split) => void
  onRemove?: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(split)
  const source = helpers.find((s) => s.id === draft.sourceId)
  const fields: ChoiceOption[] = (source?.fields ?? []).map((f) => ({ value: f.code, name: f.name || f.code }))
  const fieldName = (code: string): string => fields.find((f) => f.value === code)?.name ?? code

  const set = (part: Partial<Split>): void => setDraft({ ...draft, ...part })
  const setColumn = (at: number, part: Partial<SplitColumn>): void =>
    set({ columns: draft.columns.map((c, k) => (k === at ? { ...c, ...part } : c)) })
  const setSort = (at: number, sort: SplitSort | null): void => {
    const next = [...draft.sort]
    if (sort === null) next.splice(at, 1)
    else next[at] = sort
    set({ sort: next.filter((s) => s.field !== '').slice(0, SPLIT_SORT_MAX) })
  }
  const setHide = (at: number, hide: SplitHide | null): void => {
    const next = [...draft.hide]
    if (hide === null) next.splice(at, 1)
    else next[at] = hide
    set({ hide: next.slice(0, SPLIT_HIDE_MAX) })
  }

  const ready = draft.sourceId !== '' && draft.amountColumn !== '' && draft.columns.length > 0
  const finished: Split = { ...draft, hide: draft.hide.filter((h) => h.field !== '') }
  const sortLines = Math.min(SPLIT_SORT_MAX, draft.sort.length + 1)
  const hideLines = Math.min(SPLIT_HIDE_MAX, draft.hide.length + 1)

  return (
    <Window
      title={title}
      width={1040}
      height={620}
      level={50}
      foot={
        <>
          {onRemove !== undefined && (
            <Button kind="risk" className="mr-auto" onClick={onRemove}>
              Verteilen entfernen
            </Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" disabled={!ready} onClick={() => onApply(finished)}>
            Übernehmen
          </Button>
        </>
      }
      onClose={onClose}
    >
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-0 flex-col border-r border-line-soft">
          <Strip right={draft.columns.length === 1 ? '1 Spalte' : `${draft.columns.length} Spalten`}>
            Spalten der Liste
          </Strip>
          <Grid columns={COLUMNS}>
            {draft.columns.map((column, at) => (
              <tr key={column.key}>
                <td className={cn(TD, 'px-[10px] text-right font-mono text-dense text-muted')}>{at + 1}</td>
                <td className={cn(TD, 'px-[4px]')}>
                  <Choice
                    aria-label={`Feld der Spalte ${at + 1}`}
                    options={fields}
                    value={column.field}
                    onChoose={(field) =>
                      setColumn(at, {
                        field,
                        ...(column.title === '' || column.title === fieldName(column.field)
                          ? { title: fieldName(field) }
                          : {}),
                      })
                    }
                  />
                </td>
                <td className={TD}>
                  <input
                    aria-label={`Überschrift der Spalte ${at + 1}`}
                    className={INPUT}
                    value={column.title}
                    onChange={(e) => setColumn(at, { title: e.currentTarget.value })}
                  />
                </td>
                <td className={TD}>
                  <input
                    aria-label={`Breite der Spalte ${at + 1}`}
                    inputMode="numeric"
                    placeholder="auto"
                    className={cn(INPUT, 'text-right font-mono')}
                    value={column.width ?? ''}
                    onChange={(e) => {
                      const width = wholeOrNone(e.currentTarget.value, 999)
                      const next = { ...column }
                      delete next.width
                      set({
                        columns: draft.columns.map((c, k) => (k === at ? (width ? { ...next, width } : next) : c)),
                      })
                    }}
                  />
                </td>
                <td className={TD}>
                  <input
                    aria-label={`Bald: Tage vorher, Spalte ${at + 1}`}
                    inputMode="numeric"
                    placeholder="aus"
                    className={cn(INPUT, 'text-right font-mono')}
                    value={column.soonDays ?? ''}
                    onChange={(e) => {
                      const soonDays = wholeOrNone(e.currentTarget.value, SOON_DAYS_MAX)
                      const next = { ...column }
                      delete next.soonDays
                      set({
                        columns: draft.columns.map((c, k) =>
                          k === at ? (soonDays === undefined ? next : { ...next, soonDays }) : c,
                        ),
                      })
                    }}
                  />
                </td>
                <td className={cn(TD, 'px-[4px]')}>
                  <span className="flex items-center justify-end gap-[2px]">
                    <Button
                      onlyIcon
                      aria-label="Nach oben"
                      disabled={at === 0}
                      onClick={() => set({ columns: moved(draft.columns, at, -1) })}
                    >
                      <ChevronUp size={14} aria-hidden />
                    </Button>
                    <Button
                      onlyIcon
                      aria-label="Nach unten"
                      disabled={at === draft.columns.length - 1}
                      onClick={() => set({ columns: moved(draft.columns, at, 1) })}
                    >
                      <ChevronDown size={14} aria-hidden />
                    </Button>
                    <Button
                      onlyIcon
                      aria-label="Spalte entfernen"
                      onClick={() => set({ columns: draft.columns.filter((_, k) => k !== at) })}
                    >
                      <Trash2 size={14} aria-hidden />
                    </Button>
                  </span>
                </td>
              </tr>
            ))}
            {fields.length > 0 && (
              <GridAddLine
                onAdd={() => {
                  const free = fields.find((f) => !draft.columns.some((c) => c.field === f.value)) ?? fields[0]
                  const used = new Set(draft.columns.map((c) => c.key))
                  let n = draft.columns.length + 1
                  while (used.has(`split-${n}`)) n++
                  set({ columns: [...draft.columns, { key: `split-${n}`, title: free.name, field: free.value }] })
                }}
              >
                Spalte hinzufügen
              </GridAddLine>
            )}
          </Grid>
        </div>
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <Strip>Quelle</Strip>
          <div className={cn(SETTINGS, 'grid-cols-[112px_minmax(0,1fr)]')}>
            <span className={NAME}>Verteilen auf</span>
            <Choice
              aria-label="Verteilen auf"
              options={helpers.map((s) => ({ value: s.id, name: s.name }))}
              emptyText={helpers.length === 0 ? 'Erst eine Hilfsquelle anlegen' : undefined}
              value={draft.sourceId}
              onChoose={(sourceId) => setDraft({ ...newSplit(sourceId), amountColumn: draft.amountColumn })}
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
          <Strip>Sortierung</Strip>
          <div className={cn(SETTINGS, 'grid-cols-[112px_minmax(0,1fr)]')}>
            {Array.from({ length: sortLines }, (_, at) => {
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
                  onChoose={(field) =>
                    setSort(at, field === '' ? null : { field, ...(sort?.down ? { down: true } : {}) })
                  }
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
          <Strip>Ausblenden</Strip>
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
            {Array.from({ length: hideLines }, (_, at) => {
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
          <p className="px-[12px] py-[10px] text-dense text-muted">
            Bald: ein Datum steht so viele Tage vorher ocker, danach rot. Leer lässt die Spalte, wie sie ist.
          </p>
        </div>
      </div>
    </Window>
  )
}
