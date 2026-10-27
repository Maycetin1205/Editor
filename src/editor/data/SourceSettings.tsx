import { cn } from '@/editor/widgets/cn'
import { Strip } from '@/editor/widgets/Grid'
import type { ListGroup } from '@/editor/widgets/List'
import { relationParameterDefault, type Parameter } from '../../core/data/actions'
import { splitBinding } from '../../core/block/blockType'
import { choiceOf, fieldPrefixFromInput, type DataSource } from '../../core/data/dataSources'
import { getValueSourceAllowed } from '../../core/data/deliveries/relationValue'
import { PRESET_IDS, sourcePreset, type PresetId } from '../../core/data/presets/presets'
import { POSITIONS_RELATION, relationSyntaxAsText, type RelationTemplate } from '../../core/data/relations'
import { selectionGiverInTree } from '../../core/block/treeQuery'
import { giverGroup, sourceReach } from '../origin/reach'
import { Places } from '../actions/Places'
import { PickerControl } from '../controls/PickerControl'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { MaskFields } from './MaskFields'
import { PICKER, Setting, TextCell } from './SettingCells'
import {
  deliveries,
  deliveryOf,
  NEW_POSITIONS,
  oncePerRelation,
  withDelivery,
  withPreset,
  withSettings,
  type SourceData,
} from './sourceEdit'

const EMPTY: Parameter = { source: 'fixed', value: '' }

function useSource(source: DataSource) {
  const store = useDataSources()
  const relationStore = useRelations()
  const relations = relationStore.list
  const choice = choiceOf(source)
  const listed = sourcePreset(source.preset).list(choice)
  const getters = relations.filter((r) => r.verb === 'GET_RELATION')
  const getValue = choice.getValue
  const valued = listed.delivery.kind === 'relationValue'
  return {
    store,
    relationStore,
    relations,
    choice,
    listed,
    getters,
    getValue,
    template: valued ? getters.find((r) => r.id === getValue.relationId) : undefined,
    valued,
    save: (next: SourceData) => store.update(source.id, next),
    saveValue: (relationId: string, parameter: readonly Parameter[]) =>
      store.update(
        source.id,
        withSettings(source, { choice: { getValue: { relationId, parameter: [...parameter] } } }),
      ),
  }
}

type SourceUse = ReturnType<typeof useSource>

// What the source delivers, when its kind offers more than one thing.
function DeliverySetting({ source, use }: { source: DataSource; use: SourceUse }) {
  const delivers = deliveries(source, use.relations)
  if (delivers.length <= 1) return null
  return (
    <Setting name="Liefert">
      <PickerControl
        name="Liefert"
        className={cn(PICKER, 'w-auto min-w-[240px]')}
        wrap
        groups={[{ key: 'delivers', entries: delivers }]}
        value={deliveryOf(source)}
        onChoose={(v) => {
          if (v === deliveryOf(source)) return
          const value = v === NEW_POSITIONS ? `get:${use.relationStore.add(POSITIONS_RELATION).id}` : v
          use.save(withDelivery(source, value))
        }}
      />
    </Setting>
  )
}

// A message source is narrowed to a kind of document and, if wanted, an address.
function MessageSettings({ source, use }: { source: DataSource; use: SourceUse }) {
  const restriction = use.choice.restriction
  const saveRestriction = (change: Partial<typeof restriction>) =>
    use.save(withSettings(source, { choice: { restriction: { ...restriction, ...change } } }))
  return (
    <>
      <Setting name="Belegart">
        <TextCell
          name="Belegart"
          value={restriction.documentKind}
          valid={() => true}
          onSave={(t) => saveRestriction({ documentKind: t.trim() })}
        />
      </Setting>
      <Setting name="Adresse">
        <PickerControl
          name="Adresse"
          className={cn(PICKER, 'w-auto min-w-[200px]')}
          wrap
          groups={openRecordFields(use.store.list, source.id)}
          value={restriction.address ? `${restriction.address.sourceId}::${restriction.address.code}` : ''}
          emptyText="alle"
          onChoose={(v) => {
            const { sourceId, code } = splitBinding(v)
            saveRestriction({ address: v === '' ? null : { sourceId, code } })
          }}
        />
      </Setting>
    </>
  )
}

// The bar over a source: its kind and what that kind asks for.
export function SourceSettings({ source }: { source: DataSource }) {
  const use = useSource(source)
  const { choice, listed, getters, getValue, valued, save, saveValue } = use
  const preset = sourcePreset(source.preset)

  return (
    <div className="flex min-h-[36px] shrink-0 flex-wrap items-center gap-x-[18px] gap-y-[4px] border-b border-line-soft bg-panel px-[12px] py-[4px]">
      <Setting name="Art">
        <PickerControl
          name="Art"
          className={cn(PICKER, 'w-[150px]')}
          wrap
          groups={[{ key: 'kinds', entries: PRESET_IDS.map((id) => ({ value: id, name: sourcePreset(id).name })) }]}
          value={source.preset}
          onChoose={(id) => {
            if (id !== source.preset) save(withPreset(source, id as PresetId))
          }}
        />
      </Setting>

      <DeliverySetting source={source} use={use} />

      {(preset.prefixed || (source.fieldPrefix ?? '') !== '') && (
        <Setting name="Feld-Vorsatz">
          <TextCell
            name="Feld-Vorsatz"
            value={source.fieldPrefix ?? ''}
            valid={(t) => t.trim() === '' || fieldPrefixFromInput(t) !== ''}
            onSave={(t) => save(withSettings(source, { fieldPrefix: fieldPrefixFromInput(t) }))}
          />
        </Setting>
      )}

      {listed.delivery.kind === 'message' && <MessageSettings source={source} use={use} />}

      {listed.order.kind === 'mask' && (
        <Setting name="Bereich">
          <TextCell
            name="Bereich"
            value={choice.area}
            valid={(t) => t.trim() !== ''}
            onSave={(t) => save(withSettings(source, { choice: { area: t.trim().toUpperCase() } }))}
          />
        </Setting>
      )}

      {valued && (
        <Setting name="Relation">
          <RelationChoice
            getters={getters}
            value={getValue.relationId}
            onChoose={(t) =>
              saveValue(
                t.id,
                relationParameterDefault(t).map((b) => (getValueSourceAllowed(b.source) ? b : EMPTY)),
              )
            }
          />
        </Setting>
      )}
    </div>
  )
}

// Under the source: the places of its relation, or the fields of its mask.
export function SourceBelow({ source }: { source: DataSource }) {
  const { store, listed, getValue, template, saveValue } = useSource(source)
  const tree = useEditor().tree
  if (template) {
    const givers = selectionGiverInTree(tree).map((node) => giverGroup(node, store.list))
    return (
      <div className="flex max-h-[45%] shrink-0 flex-col border-t border-line-soft">
        <Strip>Stellen der Relation</Strip>
        <Places
          template={template}
          filled={{ parameter: getValue.parameter, extraParameter: [] }}
          reach={{ ...sourceReach(store.list, source.id), givers }}
          extras={false}
          wrap
          onChange={(filled) => saveValue(getValue.relationId, filled.parameter)}
        />
      </div>
    )
  }
  return listed.order.kind === 'mask' ? <MaskFields source={source} /> : null
}

function RelationChoice({
  getters,
  value,
  onChoose,
}: {
  getters: readonly RelationTemplate[]
  value: string
  onChoose: (relation: RelationTemplate) => void
}) {
  return (
    <PickerControl
      name="Relation"
      className={cn(PICKER, 'w-auto min-w-[280px]')}
      wrap
      groups={[
        {
          key: 'relations',
          entries: oncePerRelation(getters, value).map((r) => ({
            value: r.id,
            name: r.name,
            badge: relationSyntaxAsText(r),
          })),
        },
      ]}
      value={value}
      onChoose={(id) => {
        const t = getters.find((r) => r.id === id)
        if (t) onChoose(t)
      }}
    />
  )
}

function openRecordFields(sources: readonly DataSource[], ownId: string): ListGroup[] {
  return sources
    .filter((s) => s.id !== ownId && choiceOf(s).openRecord && s.fields.length > 0)
    .map((s) => ({
      key: s.id,
      name: s.name,
      entries: s.fields.map((f) => ({ value: `${s.id}::${f.code}`, name: f.name })),
    }))
}
