import { declaredValue } from '../../core/block/registry'
import { SOURCE_PROP, SOURCE_PROPERTY } from '../../core/block/sharedProperties'
import { Plus, X } from '../icons/icon'
import { Button } from '../widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import { sourcesKey, type DataField, type DataSource } from '../../core/data/dataSources'
import { EXTRA_SOURCES_PROP, extraSourcesProperty, type ExtraSource } from '../../core/data/extraSources'
import { useDataSources, useEditor } from '../state/useEditor'
import type { ValueOrigin } from '../../core/data/valueOrigin'
import { OriginPicker } from '../origin/OriginPicker'
import { formFieldsOf, outsideReach, type Reach } from '../origin/reach'
import { PickerControl } from '../controls/PickerControl'
import { Labeled } from './Labeled'
import { KeyPairRows } from './KeyPairRows'
import { fieldsOfSource, freeSources, originChange, originOf, partnerOf, reachFor } from './helperSources'

const NEW_SOURCE = 'new-source'

interface SourceListProps {
  block: BlockNode

  part?: 'own' | 'helpers' | 'all'
}

export function SourceList({ block, part = 'all' }: SourceListProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const first = declaredValue(block, SOURCE_PROPERTY)
  const extra = declaredValue(block, extraSourcesProperty)

  const setExtra = (next: ExtraSource[]) => ed.updateProperty(block.id, EXTRA_SOURCES_PROP, next)
  const change = (index: number, patch: Partial<ExtraSource>) =>
    setExtra(extra.map((q, i) => (i === index ? { ...q, ...patch } : q)))

  const outside = outsideReach(library, formFieldsOf(ed.tree, library))

  if (library.length === 0) {
    return (
      <Button className="self-start" onClick={() => ed.view.startNewSource(block.id)}>
        <Plus size={14} /> Neue Datenquelle
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {part !== 'helpers' && (
        <SourceSelection
          title="Datenquelle"
          value={first}
          sources={freeSources(library, first, extra, first)}
          onChoose={(v) => ed.updateProperty(block.id, SOURCE_PROP, v)}
          onNewSource={() => ed.view.startNewSource(block.id)}
        />
      )}

      {part !== 'own' &&
        extra.map((q, i) => (
          <HelperSource
            key={i}
            index={i}
            source={q}
            partner={partnerOf(first, q)}
            choices={freeSources(library, first, extra, q.sourceId)}
            fields={fieldsOfSource(library, q.sourceId)}
            reach={reachFor(library, first, extra, i, outside)}
            onChange={(patch) => change(i, patch)}
            onRemove={() => setExtra(extra.filter((_, at) => at !== i))}
          />
        ))}

      {part !== 'own' && first !== '' && (
        <Button className="self-start" onClick={() => setExtra([...extra, { sourceId: '', partnerId: '', pairs: [] }])}>
          <Plus size={13} /> Hilfsquelle
        </Button>
      )}
    </div>
  )
}

const sourceEntries = (sources: readonly DataSource[]) =>
  sources.map((s) => ({ value: s.id, name: s.name, badge: sourcesKey(s) }))

// Picks a source, or starts a new one.
function SourceSelection({
  title,
  value,
  sources,
  onChoose,
  onNewSource,
}: {
  title: string
  value: string
  sources: readonly DataSource[]
  onChoose: (id: string) => void
  onNewSource: () => void
}) {
  return (
    <Labeled label={title}>
      <PickerControl
        name={title}
        className="w-full"
        groups={[
          { key: 'sources', entries: sourceEntries(sources) },
          { key: 'new', entries: [{ value: NEW_SOURCE, name: 'Neue Datenquelle' }] },
        ]}
        value={value}
        emptyText="Keine"
        onChoose={(v) => (v === NEW_SOURCE ? onNewSource() : onChoose(v))}
      />
    </Labeled>
  )
}

// One helper source: its picker and the key pairs that join it to the row.
function HelperSource({
  index,
  source: q,
  partner,
  choices,
  fields,
  reach,
  onChange,
  onRemove,
}: {
  index: number
  source: ExtraSource
  partner: string
  choices: readonly DataSource[]
  fields: readonly DataField[]
  reach: Reach
  onChange: (patch: Partial<ExtraSource>) => void
  onRemove: () => void
}) {
  const pickOrigin = (at: number, origin: ValueOrigin) => {
    const patch = originChange(q, partner, at, origin)
    if (patch) onChange(patch)
  }
  return (
    <div className="flex flex-col gap-[6px] border-b border-line-soft pb-[8px]">
      <div className="flex items-center gap-1">
        <PickerControl
          name={`Hilfsquelle ${index + 1}`}
          className="min-w-0 flex-1"
          groups={[{ key: 'sources', entries: sourceEntries(choices) }]}
          value={q.sourceId}
          emptyText="Keine"
          onChoose={(v) => onChange({ sourceId: v })}
        />
        <Button onlyIcon aria-label={`Hilfsquelle ${index + 1} entfernen`} onClick={onRemove}>
          <X size={13} />
        </Button>
      </div>

      {q.sourceId !== '' && (
        <KeyPairRows
          pairs={q.pairs}
          left={(pair, at) => (
            <OriginPicker
              name={`Wert ${at + 1}`}
              origin={originOf(partner, pair)}
              reach={reach}
              onChoose={(origin) => pickOrigin(at, origin)}
            />
          )}
          rightFields={fields}
          rightName={(at) => `Feld ${at + 1} der Hilfsquelle ${index + 1}`}
          removeName={(at) => `Zeile ${at + 1} entfernen`}
          onChange={(keyPairs) => onChange({ pairs: keyPairs })}
        />
      )}
    </div>
  )
}
