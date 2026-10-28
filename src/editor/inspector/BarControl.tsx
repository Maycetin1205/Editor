import { useContext } from 'react'
import { FieldBar, SourceBar } from './PickerBars'
import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import type { Property } from '../../core/block/property'
import type { DataSource } from '../../core/data/dataSources'
import { boundField } from '../../core/data/boundField'
import { useDataSources, useEditor } from '../state/useEditor'
import { Choice } from '../widgets/Choice'
import { Field } from '../widgets/Field'
import { LadderControl } from '../controls/LadderControl'
import { NumberControl } from '../controls/NumberControl'
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

export function BarControl({ block, propertyKey, property, sourceInReach, session, entry }: BarControlProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const value = entry ? entry.values[propertyKey] : block.values[propertyKey]
  const set = (v: unknown) => (entry ? entry.set(propertyKey, v) : ed.updateProperty(block.id, propertyKey, v))

  if (!controlShown(property, block, sourceInReach, library)) return null

  switch (property.type.control) {
    case 'source':
      return <SourceBar property={property} value={value} sources={library} onSet={set} />
    case 'field':
      return (
        <FieldBar
          blockId={block.id}
          property={property}
          value={value}
          fieldSource={fieldSourceOf(property, block, sourceInReach, library)}
          onSet={set}
        />
      )
    case 'boolean':
      return <Switch label={property.label} on={value === true} onToggle={set} />
    case 'text':
      return (
        <TextBar
          block={block}
          property={property}
          value={value}
          inEntry={entry !== undefined}
          session={session}
          onSet={set}
        />
      )
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
        <Labeled label={property.label} fixedWidth>
          <SegmentControl
            name={property.label}
            options={property.type.options ?? []}
            value={String(value ?? '')}
            onChange={set}
          />
        </Labeled>
      )
    case 'choice':
      return <ChoiceBar property={property} value={String(value ?? '')} onChoose={set} />
    default:
      return null
  }
}

// A text that may be named after a field of the parent; an unset parent field is asked for first.
function TextBar({
  block,
  property,
  value,
  inEntry,
  session,
  onSet,
}: {
  block: BlockNode
  property: Property<unknown>
  value: unknown
  inEntry: boolean
  session: EditCallbacks
  onSet: (value: string) => void
}) {
  const ed = useEditor()
  const inLine = useContext(LabelsShown)
  const parentKey = property.nameFromParentField
  const parent =
    parentKey === undefined ? undefined : inEntry ? block : block.parentId ? ed.getNode(block.parentId) : undefined
  const code = parent && parentKey !== undefined ? String(parent.values[parentKey] ?? '') : ''
  const fieldName = code === '' || !parent ? '' : (boundField(code, ed.sourcesFor(parent.id))?.name ?? '')
  const parentField = fieldName !== '' ? fieldName : code
  // On the canvas the bar shows no labels: an empty box says what goes in.
  const hint = parentField !== '' ? parentField : property.label
  const text = (
    <BarText
      property={property}
      value={String(value ?? '')}
      wide={inLine}
      placeholder={inLine ? undefined : hint}
      onChange={onSet}
      {...session}
    />
  )

  if (!parent || parentKey === undefined) return <Labeled label={property.label}>{text}</Labeled>
  if (code === '') {
    const parentProperty = blockType(parent.type)?.properties[parentKey]
    return parentProperty ? (
      <BarControl
        block={parent}
        propertyKey={parentKey}
        property={parentProperty}
        sourceInReach={ed.dataSourceFor(parent.id)}
        session={session}
      />
    ) : null
  }
  return <Labeled label={`${parentField} =`}>{text}</Labeled>
}

function ChoiceBar({
  property,
  value,
  onChoose,
}: {
  property: Property<unknown>
  value: string
  onChoose: (value: string) => void
}) {
  const inLine = useContext(LabelsShown)
  const options = property.type.options ?? []
  if (options.length > 1 && options.every((o) => o.icon !== undefined || o.value === '')) {
    return <SymbolChoice label={property.label} options={options} value={value} onChange={onChoose} />
  }
  return options.length > 0 && options.every((o) => o.color !== undefined) ? (
    <SwatchChoice label={property.label} options={options} value={value} onChange={onChoose} />
  ) : (
    <Labeled label={property.label}>
      <Choice
        aria-label={property.label}
        className={inLine ? 'w-full' : 'w-auto'}
        options={options}
        value={value}
        onChoose={onChoose}
      />
    </Labeled>
  )
}

function BarText({
  property,
  value,
  wide,
  placeholder,
  onChange,
  onBeginEditing,
  onEndEditing,
}: {
  property: Property<unknown>
  value: string
  wide: boolean
  placeholder?: string
  onChange: (value: string) => void
} & EditCallbacks) {
  const session = useInputSession(onBeginEditing, onEndEditing)
  return (
    <Field
      aria-label={property.label}
      value={value}
      placeholder={placeholder}
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
