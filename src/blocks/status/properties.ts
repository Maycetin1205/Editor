import { entryMoved, listDefaultTitle, listForExport, type ListBinding } from '../../core/block/listBinding'
import {
  booleanProperty,
  fieldProperty,
  listProperty,
  readValues,
  segmentProperty,
  textProperty,
  type Property,
  type ValuesOf,
} from '../../core/block/property'
import { isUnread } from '../../core/unread'
import { toneProperty } from '../look/look'

// One state of a field: the value it stands for, the word it shows, its tone.
export interface StatusState {
  word: string
  value: string
  tone: string
}

const stateProperties = {
  word: textProperty({
    default: 'Zustand',
    label: 'Wort',
    place: 'block',
    attribute: 'word',
  }),
  value: textProperty({
    default: '',
    label: 'Wert',
    attribute: 'value',
    nameFromParentField: 'valueField',
  }),
  tone: toneProperty({ default: 'neutral' }),
}

function state(word: string, tone: string): StatusState {
  return { word, value: '', tone }
}

function defaultStates(): StatusState[] {
  return [state('Offen', 'warning'), state('Erledigt', 'success')]
}

function stateFrom(raw: unknown): StatusState {
  const values = readValues(stateProperties, isUnread<StatusState>(raw) ? raw : {})
  return { word: String(values.word), value: String(values.value), tone: String(values.tone) }
}

function statesFrom(raw: unknown): StatusState[] {
  return Array.isArray(raw) && raw.length > 0 ? raw.map(stateFrom) : defaultStates()
}

export const STATES_BINDING: ListBinding<StatusState, 'states'> = {
  prop: 'states',
  defaultTitle: 'Zustand {n}',
  fieldless: true,
  entryProperties: { value: stateProperties.value, tone: stateProperties.tone },
  entries: statesFrom,
  titleOf: (s) => s.word,
  fieldOf: () => '',
  withTypedTitle: (s, word) => ({ ...s, word }),
  withPickedField: (s) => s,
  withoutEditorMarks: (s) => s,
  entryAdd: (states) => [...states, state(listDefaultTitle(STATES_BINDING, states.length), 'neutral')],
  entryRemove: (states, index) => (states.length <= 1 ? null : states.filter((_, i) => i !== index)),
  entryMove: entryMoved,
  entryHeads: true,
}

function statesProperty(): Property<StatusState[]> {
  return listProperty<StatusState[]>(
    statesFrom,
    {
      default: defaultStates(),
      label: 'Zustände',
      place: 'block',
      attribute: 'states',
    },
    (value) => listForExport(value, STATES_BINDING),
  )
}

export const statusProperties = {
  valueField: fieldProperty({
    default: '',
    label: 'Feld',
    place: 'data',
    attribute: 'valuefield',
  }),
  // A value no state names: shown as it is, in the neutral tone, or left out.
  others: segmentProperty(
    [
      { value: 'show', name: 'Zeigen' },
      { value: 'hide', name: 'Ausblenden' },
    ],
    {
      default: 'show',
      label: 'Anderer Wert',
      place: 'data',
      attribute: 'others',
      needsSource: true,
    },
  ),
  states: statesProperty(),
  form: segmentProperty(
    [
      { value: 'chip', name: 'Chip' },
      { value: 'dot', name: 'Punkt' },
    ],
    {
      default: 'chip',
      label: 'Form',
      place: 'look',
      attribute: 'form',
    },
  ),
  showLabel: booleanProperty({
    default: false,
    label: 'Beschriftung',
    place: 'look',
    attribute: 'showlabel',
  }),
  label: textProperty({
    default: 'Status',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
    when: { key: 'showLabel', equals: true },
  }),
}

export type StatusValues = ValuesOf<typeof statusProperties>
