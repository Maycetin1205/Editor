import type { ValueBinding } from './actions'
import type { IconName } from './icons'

// How a block describes its settings. From this one description the editor
// draws the inspector, the export learns which fields a mask reads, and a
// renamed field finds every text that mentions it.

export type Props = Record<string, unknown>

export interface Choice {
  value: string
  label: string
  icon?: IconName
}

interface ControlBase {
  // The setting this control edits: a key of the props (or of a list item).
  key: string
  label: string
  help?: string
  // Shown only while this holds. `own` is the object the key lives in (the
  // props, or the item of a list), `props` always the props of the block.
  when?: (own: Props, props: Props) => boolean
}

export interface TextControl extends ControlBase {
  kind: 'text'
  placeholder?: string
  multiline?: boolean
}

// A text that may hold fields in braces: "{Tiername} ({Rasse})".
export interface TemplateControl extends ControlBase {
  kind: 'template'
  // Key of the props that holds the source the fields come from.
  source: string
  placeholder?: string
  multiline?: boolean
}

export interface NumberControl extends ControlBase {
  kind: 'number'
  min?: number
  max?: number
  step?: number
  unit?: string
}

export interface ToggleControl extends ControlBase {
  kind: 'toggle'
}

export interface ChoiceControl extends ControlBase {
  kind: 'choice'
  options: readonly Choice[]
  // segmented: buttons side by side, for up to four short options.
  as?: 'segmented' | 'select'
}

export interface SourceControl extends ControlBase {
  kind: 'source'
  optional?: boolean
}

export interface FieldControl extends ControlBase {
  kind: 'field'
  source: string
  optional?: boolean
}

export interface IconControl extends ControlBase {
  kind: 'icon'
}

export interface ToneControl extends ControlBase {
  kind: 'tone'
}

// A picture the user uploads; the value is a data address.
export interface ImageControl extends ControlBase {
  kind: 'image'
}

// A list of things with settings of their own: the columns of a table, the
// options of a choice.
export interface ListControl extends ControlBase {
  kind: 'list'
  itemLabel: string
  item: readonly Control[]
  title: (item: Props, index: number) => string
  create: (index: number) => Props
}

export interface FiltersControl extends ControlBase {
  kind: 'filters'
  source: string
}

export interface SortControl extends ControlBase {
  kind: 'sort'
  source: string
}

// A plain sentence between the controls.
export interface NoteControl {
  kind: 'note'
  key: string
  text: string
  when?: (own: Props, props: Props) => boolean
}

export type Control =
  | TextControl
  | TemplateControl
  | NumberControl
  | ToggleControl
  | ChoiceControl
  | SourceControl
  | FieldControl
  | IconControl
  | ToneControl
  | ImageControl
  | ListControl
  | FiltersControl
  | SortControl
  | NoteControl

// The inspector sorts settings by the user's questions: what does it show,
// where do the data come from, how does it look.
export type SectionTab = 'content' | 'data' | 'look'

export interface Section {
  tab: SectionTab
  title?: string
  controls: readonly Control[]
}

export type FilterOp = 'eq' | 'ne' | 'contains' | 'filled' | 'empty' | 'today' | 'day'

export const FILTER_OPS: readonly { value: FilterOp; label: string; needsValue: boolean }[] = [
  { value: 'eq', label: 'ist gleich', needsValue: true },
  { value: 'ne', label: 'ist nicht', needsValue: true },
  { value: 'contains', label: 'enthält', needsValue: true },
  { value: 'filled', label: 'ist ausgefüllt', needsValue: false },
  { value: 'empty', label: 'ist leer', needsValue: false },
  { value: 'today', label: 'ist heute', needsValue: false },
  { value: 'day', label: 'ist der gewählte Tag', needsValue: false },
]

// Keeps only the rows of a list whose field passes.
export interface FilterData {
  id: string
  field: string
  op: FilterOp
  value: ValueBinding
}

export interface SortData {
  field: string
  dir: 'asc' | 'desc'
}

export const NO_SORT: SortData = { field: '', dir: 'asc' }

export interface SchemaVisitor {
  field?(ref: string, sourceId: string): void
  template?(text: string, sourceId: string): string | void
  binding?(binding: ValueBinding): void
  source?(sourceId: string): void
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

function visitControls(controls: readonly Control[], own: Props, props: Props, visitor: SchemaVisitor): Props {
  let next = own
  const sourceOf = (key: string): string => text(props[key])
  for (const control of controls) {
    if (control.kind === 'note') continue
    const value = own[control.key]
    switch (control.kind) {
      case 'source':
        if (text(value) !== '') visitor.source?.(text(value))
        break
      case 'field':
        if (text(value) !== '') visitor.field?.(text(value), sourceOf(control.source))
        break
      case 'template': {
        const changed = visitor.template?.(text(value), sourceOf(control.source))
        if (typeof changed === 'string' && changed !== value) next = { ...next, [control.key]: changed }
        break
      }
      case 'filters':
        for (const filter of Array.isArray(value) ? (value as FilterData[]) : []) {
          if (filter.field !== '') visitor.field?.(filter.field, sourceOf(control.source))
          visitor.binding?.(filter.value)
        }
        break
      case 'sort': {
        const sort = value as SortData | undefined
        if (sort && sort.field !== '') visitor.field?.(sort.field, sourceOf(control.source))
        break
      }
      case 'list': {
        const items = Array.isArray(value) ? (value as Props[]) : []
        const visited = items.map((item) => visitControls(control.item, item, props, visitor))
        if (visited.some((item, i) => item !== items[i])) next = { ...next, [control.key]: visited }
        break
      }
      default:
        break
    }
  }
  return next
}

// Walks every setting of a block that names a source, a field or a template.
// A visitor that returns a new template text gets it written; the changed
// props come back (the same object when nothing changed).
export function visitProps(sections: readonly Section[], props: Props, visitor: SchemaVisitor): Props {
  let next = props
  for (const section of sections) next = visitControls(section.controls, next, next, visitor)
  return next
}
