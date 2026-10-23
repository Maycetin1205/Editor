import { useContext } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import type { Property } from '../../core/block/property'
import { fieldOf, sourcesKey, type DataSource } from '../../core/data/dataSources'
import { boundField } from '../../core/data/boundField'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import type { ListGroup } from '@/editor/widgets/List'
import { Choice } from '@/editor/widgets/Choice'
import { Field } from '@/editor/widgets/Field'
import { LadderControl } from '../controls/LadderControl'
import { NumberControl } from '../controls/NumberControl'
import { PickerControl } from '../controls/PickerControl'
import { SegmentControl } from '../controls/SegmentControl'
import { useInputSession } from '../controls/useInputSession'
import { controlShown, fieldSourceOf } from '../bar/controlShown'
import { Labeled, Switch } from '../bar/Labeled'
import { LabelsShown } from '../bar/labelsShown'
import { SwatchChoice } from '../bar/SwatchChoice'
import { SymbolChoice } from '../bar/SymbolChoice'

interface EditCallbacks {
  onBeginEditing: () => void
  onEndEditing: () => void
}

export interface EntryAccess {
  values: Readonly<Record<string, unknown>>
  set: (key: string, value: unknown) => void
}

interface BarControlProps {
  block: BlockNode
  propertyKey: string
  property: Property<unknown>

  sourceInReach: DataSource | undefined
  session: EditCallbacks

  entry?: EntryAccess
}

interface PickerCase {
  denominator: string
  groups: ListGroup[]
  value: string
  emptyText: string
  onChoose: (value: string) => void
}

export function BarControl({ block, propertyKey, property, sourceInReach, session, entry }: BarControlProps) {
  const ed = useEditor()
  const inLine = useContext(LabelsShown)

  const sources = useDataSources()

  const value = entry ? entry.values[propertyKey] : block.values[propertyKey]
  const kind = property.type.control
  const set = (v: unknown) => (entry ? entry.set(propertyKey, v) : ed.updateProperty(block.id, propertyKey, v))

  const fieldSource = fieldSourceOf(property, block, sourceInReach, sources.list)

  const parent =
    property.nameFromParentField === undefined
      ? undefined
      : entry
        ? block
        : block.parentId
          ? ed.getNode(block.parentId)
          : undefined
  const parentField =
    parent && property.nameFromParentField !== undefined
      ? (boundField(String(parent.values[property.nameFromParentField] ?? ''), ed.sourcesFor(parent.id))?.name ?? '')
      : ''

  if (!controlShown(property, block, sourceInReach, sources.list)) return null

  const pickerCase = (): PickerCase | undefined => {
    switch (kind) {
      case 'source':
        return {
          denominator: 'Quelle',
          groups: [
            {
              key: 'sources',
              entries: sources.list.map((q) => ({
                value: q.id,
                name: q.name,
                badge: sourcesKey(q),
              })),
            },
          ],
          value: typeof value === 'string' ? value : '',
          emptyText: 'Keine',
          onChoose: (newId) => {
            if (newId !== String(value ?? '')) set(newId)
          },
        }

      case 'field':
        return {
          denominator: 'Feld',
          groups: [
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
          ],
          value: value == null ? '' : String(value),
          emptyText: 'Nicht gebunden',
          onChoose: (code) => {
            ed.transaction(() => {
              set(code)

              if (property.plainNameProp) {
                const plainName = fieldOf(fieldSource, code)?.name ?? ''
                ed.updateProperty(block.id, property.plainNameProp, plainName)
              }
            })
          },
        }

      default:
        return undefined
    }
  }

  const fall = pickerCase()
  if (fall) {
    const { denominator, ...rest } = fall
    return (
      <Labeled label={property.label}>
        <PickerControl name={`${denominator} für ${property.label}`} className={inLine ? 'w-full' : 'w-36'} {...rest} />
      </Labeled>
    )
  }

  const options = property.type.options ?? []

  switch (kind) {
    case 'boolean':
      return <Switch label={property.label} on={value === true} onToggle={set} />
    case 'text': {
      if (parent && property.nameFromParentField !== undefined) {
        const code = String(parent.values[property.nameFromParentField] ?? '')
        if (code === '') {
          const parentProperty = blockType(parent.type)?.properties[property.nameFromParentField]
          return parentProperty ? (
            <BarControl
              block={parent}
              propertyKey={property.nameFromParentField}
              property={parentProperty}
              sourceInReach={ed.dataSourceFor(parent.id)}
              session={session}
            />
          ) : null
        }
        return (
          <Labeled label={`${parentField !== '' ? parentField : code} =`}>
            <BarText property={property} value={String(value ?? '')} wide={inLine} onChange={set} {...session} />
          </Labeled>
        )
      }
      return (
        <Labeled label={property.label}>
          <BarText property={property} value={String(value ?? '')} wide={inLine} onChange={set} {...session} />
        </Labeled>
      )
    }
    case 'number':
      return (
        <Labeled label={property.label}>
          <NumberControl property={property} value={value} onChange={set} {...session} />
        </Labeled>
      )
    case 'ladder':
      return (
        <Labeled label={property.label}>
          <LadderControl property={property} value={String(value ?? '')} onChange={set} />
        </Labeled>
      )
    case 'segment':
      return (
        <Labeled label={property.label}>
          <SegmentControl name={property.label} options={options} value={String(value ?? '')} onChange={set} />
        </Labeled>
      )
    case 'choice':
      if (options.length > 1 && options.every((o) => o.icon !== undefined || o.value === '')) {
        return <SymbolChoice label={property.label} options={options} value={String(value ?? '')} onChange={set} />
      }
      return options.length > 0 && options.every((o) => o.color !== undefined) ? (
        <SwatchChoice label={property.label} options={options} value={String(value ?? '')} onChange={set} />
      ) : (
        <Labeled label={property.label}>
          <Choice
            aria-label={property.label}
            className={inLine ? 'w-full' : 'w-auto'}
            options={options}
            value={String(value ?? '')}
            onChoose={set}
          />
        </Labeled>
      )
    default:
      return null
  }
}

function BarText({
  property,
  value,
  wide,
  onChange,
  onBeginEditing,
  onEndEditing,
}: {
  property: Property<unknown>
  value: string
  wide: boolean
  onChange: (value: string) => void
} & EditCallbacks) {
  const session = useInputSession(onBeginEditing, onEndEditing)
  return (
    <Field
      aria-label={property.label}
      value={value}
      maxLength={property.maxLength || undefined}
      className={wide ? 'w-full' : 'w-28'}
      onChange={(e) => {
        session.begin()
        onChange(e.currentTarget.value)
      }}
      onBlur={session.finish}
    />
  )
}
