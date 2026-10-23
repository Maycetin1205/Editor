import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, Trash2, type Icon } from '@/editor/icons/icon'
import { Button, OPENER } from '@/editor/widgets/Button'
import { Separator } from '@/editor/widgets/Separator'
import { useCloseOnEscape } from '@/editor/widgets/useCloseOnEscape'
import type { BlockNode } from '../../core/block/tree'
import type { Property } from '../../core/block/property'
import { FieldPicker, type PickerField, type PickerGroup, type SourcesChoice } from '../canvas/FieldPicker'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { BarControl, type EntryAccess } from '../inspector/BarControl'
import { Labeled, Switch } from './Labeled'
import { BarFrame, BarSign } from './BarFrame'
import { BarWindow } from './BarWindow'
import { controlShown } from './controlShown'

const BAR_PARTS = 7

interface ColumnSwitch {
  key: string
  label: string
  on: boolean
  onToggle: (on: boolean) => void
}

interface ColumnAction {
  label: string
  icon: Icon
  onOpen: () => void
}

interface ColumnBarProps {
  block: BlockNode

  name: string

  at: { top: number; left: number }

  fields: readonly PickerField[]
  groups: readonly PickerGroup[]
  sourcesChoice?: SourcesChoice
  nameOf: (value: string) => string

  switches: readonly ColumnSwitch[]
  actions: readonly ColumnAction[]

  entries?: readonly {
    properties: readonly (readonly [string, Property<unknown>])[]
    access: EntryAccess
  }[]

  removeLabel: string
  onRemove?: () => void
  onClose: () => void
}

export function ColumnBar({
  block, name, at, fields, groups, sourcesChoice, nameOf,
  switches, actions, entries = [], removeLabel, onRemove, onClose,
}: ColumnBarProps) {
  const ed = useEditor()
  const library = useDataSources().list
  useCloseOnEscape(onClose)

  useEffect(() => {
    const beside = (e: PointerEvent): void => {
      const inside = e.composedPath().some((t) => t instanceof HTMLElement
        && (t.getAttribute('role') === 'dialog' || t.dataset.ffEditorHelper !== undefined))
      if (!inside) onClose()
    }
    document.addEventListener('pointerdown', beside, true)
    return () => document.removeEventListener('pointerdown', beside, true)
  }, [onClose])

  const session = useMemo(() => ({
    onBeginEditing: () => ed.beginTransaction(),
    onEndEditing: () => ed.endTransaction(),
  }), [ed])
  const sourceInReach = ed.dataSourceFor(block.id)
  const own = entries.flatMap(({ properties, access }, group) => properties
    .filter(([, property]) => controlShown(property, block, sourceInReach, library))
    .map(([key, property]) => ({ key: `${group}:${key}`, propertyKey: key, property, access })))
  const parts = 1 + fields.length + own.length + switches.length + actions.length + (onRemove ? 1 : 0)
  const fieldsFrom = fields.filter((field) => field.onlyForeignSources === true)
  const fieldsTo = fields.filter((field) => field.onlyForeignSources !== true)

  const shows = (
    <>
      {own.map(({ key, propertyKey, property, access }) => (
        <BarControl
          key={key}
          block={block}
          propertyKey={propertyKey}
          property={property}
          sourceInReach={sourceInReach}
          session={session}
          entry={access}
        />
      ))}
      {switches.map((s) => <Switch key={s.key} label={s.label} on={s.on} onToggle={s.onToggle} />)}
    </>
  )

  return (
    <BarFrame at={at} onClose={onClose}>
      <BarSign type={block.type} name={name} />
      <Separator vertical />

      {fieldsFrom.map((field) => (
        <FieldChoice
          key={field.key}
          field={field}
          groups={groups.filter((g) => g.sourceId !== '')}
          sourcesChoice={sourcesChoice}
          nameOf={nameOf}
        />
      ))}
      {fieldsFrom.length > 0 && fieldsTo.length > 0 && (
        <ArrowRight size={13} aria-hidden className="shrink-0 text-muted" />
      )}
      {fieldsTo.map((field) => (
        <FieldChoice
          key={field.key}
          field={field}
          groups={groups}
          sourcesChoice={sourcesChoice}
          nameOf={nameOf}
        />
      ))}
      {parts > BAR_PARTS
        ? (
            <BarWindow label="Anzeige">
              {() => <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[4px] [&>:not([data-switch])]:basis-full">{shows}</div>}
            </BarWindow>
          )
        : shows}
      {actions.map((a) => (
        <Button key={a.label} onlyIcon aria-label={a.label} title={a.label} onClick={a.onOpen}>
          {createElement(a.icon, { size: 15 })}
        </Button>
      ))}

      {onRemove && (
        <>
          <Separator vertical />
          <Button onlyIcon kind="risk" title={removeLabel} aria-label={removeLabel} onClick={onRemove}>
            <Trash2 size={14} />
          </Button>
        </>
      )}
    </BarFrame>
  )
}

function FieldChoice({ field, groups, sourcesChoice, nameOf }: {
  field: PickerField
  groups: readonly PickerGroup[]
  sourcesChoice?: SourcesChoice
  nameOf: (value: string) => string
}) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)

  return (
    <Labeled label={field.label}>
      <button
        ref={button}
        type="button"
        aria-label={field.label}
        aria-haspopup="dialog"
        aria-expanded={at !== null}
        onClick={() => {
          const r = button.current?.getBoundingClientRect()
          setAt(at !== null || !r ? null : { top: r.bottom + 4, left: r.left })
        }}
        className={OPENER}
      >
        {field.current !== ''
          ? <span className="max-w-[220px] truncate">{nameOf(field.current)}</span>
          : <span className="text-muted">{field.label}</span>}
        <ChevronDown size={13} aria-hidden className="text-muted" />
      </button>
      {at !== null && (
        <FieldPicker
          spotLabel={field.label}
          groups={groups}
          sourcesChoice={sourcesChoice}
          current={field.current}
          anchor={button}
          top={at.top}
          left={at.left}
          onPick={(value) => {
            field.onChoose(value)
            setAt(null)
          }}
          onClose={() => setAt(null)}
        />
      )}
    </Labeled>
  )
}
