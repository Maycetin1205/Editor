import { useContext } from 'react'
import type { Property } from '../../core/block/property'
import { fieldOf, sourcesKey, type DataSource } from '../../core/data/dataSources'
import { Labeled } from '../bar/Labeled'
import { LabelsShown } from '../bar/labelsShown'
import { PickerControl } from '../controls/PickerControl'
import { useEditor } from '../state/useEditor'
import type { ListGroup } from '../widgets/List'

// The bars that pick a data source or a field for a property.

// A labelled picker whose entries come from `groups`.
function PropertyPicker({
  label,
  denominator,
  groups,
  value,
  emptyText,
  onChoose,
}: {
  label: string
  denominator: string
  groups: ListGroup[]
  value: string
  emptyText: string
  onChoose: (value: string) => void
}) {
  const inLine = useContext(LabelsShown)
  return (
    <Labeled label={label}>
      <PickerControl
        name={`${denominator} für ${label}`}
        className={inLine ? 'w-full' : 'w-36'}
        groups={groups}
        value={value}
        emptyText={emptyText}
        onChoose={onChoose}
      />
    </Labeled>
  )
}

export function SourceBar({
  property,
  value,
  sources,
  onSet,
}: {
  property: Property<unknown>
  value: unknown
  sources: readonly DataSource[]
  onSet: (value: unknown) => void
}) {
  return (
    <PropertyPicker
      label={property.label}
      denominator="Quelle"
      groups={[
        {
          key: 'sources',
          entries: sources.map((q) => ({
            value: q.id,
            name: q.name,
            badge: sourcesKey(q),
          })),
        },
      ]}
      value={typeof value === 'string' ? value : ''}
      emptyText="Keine"
      onChoose={(newId) => {
        if (newId !== String(value ?? '')) onSet(newId)
      }}
    />
  )
}

// Binds a field; the plain name of the field goes into a second property when the property asks for it.
export function FieldBar({
  blockId,
  property,
  value,
  fieldSource,
  onSet,
}: {
  blockId: string
  property: Property<unknown>
  value: unknown
  fieldSource: DataSource | undefined
  onSet: (value: unknown) => void
}) {
  const ed = useEditor()
  return (
    <PropertyPicker
      label={property.label}
      denominator="Feld"
      groups={[
        {
          key: 'fields',
          name: fieldSource?.name,
          badge: fieldSource ? sourcesKey(fieldSource) : undefined,
          entries: (fieldSource?.fields ?? []).map((f) => ({
            value: f.code,
            name: f.name,
            badge: f.code,
          })),
        },
      ]}
      value={value == null ? '' : String(value)}
      emptyText="Nicht gebunden"
      onChoose={(code) => {
        ed.history.transaction(() => {
          onSet(code)

          if (property.plainNameProp) {
            const plainName = fieldOf(fieldSource, code)?.name ?? ''
            ed.updateProperty(blockId, property.plainNameProp, plainName)
          }
        })
      }}
    />
  )
}
