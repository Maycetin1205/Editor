import {
  choiceProperty,
  segmentProperty,
  type Condition,
  type Property,
  type PropertyValue,
  type ValuesOf,
} from '../../core/block/property'
import { listProperties } from '../list'
import { spotFieldProperty } from '../parts/card'

// A table is cells under a head, or a list: one card per record, without
// head, foot, search, paging, sorting or column choice.
export const AS_LIST: Condition<'look'> = { key: 'look', equals: 'list' }
export const AS_TABLE: Condition<'look'> = { key: 'look', notEquals: 'list' }

// A table gives the record its rows choose; a list only while it picks one.
export const GIVES_CHOICE: Condition<'look' | 'pick'> = {
  key: 'look',
  notEquals: 'list',
  otherwise: { key: 'pick', equals: 'one' },
}

const { dayField, ...settings } = listProperties(true)

function asTable<V extends PropertyValue>(property: Property<V>): Property<V> {
  return { ...property, when: AS_TABLE }
}

export const tableProperties = {
  look: segmentProperty(
    [
      { value: 'table', name: 'Tabelle' },
      { value: 'list', name: 'Liste' },
    ],
    {
      default: 'table',
      label: 'Form',
      place: 'content',
      attribute: 'look',
    },
  ),
  columns: asTable(settings.columns),
  search: asTable(settings.search),
  paging: asTable(settings.paging),
  sortByClick: asTable(settings.sortByClick),
  columnPicker: asTable(settings.columnPicker),
  dayField,
  pick: choiceProperty(
    [
      { value: 'one', name: 'Eine Zeile' },
      { value: 'none', name: 'Keine' },
    ],
    {
      default: 'one',
      label: 'Auswahl',
      attribute: 'pick',
      when: AS_LIST,
    },
  ),
  headingField: spotFieldProperty('Titel', 'headingfield'),
  sublineField: spotFieldProperty('Unterzeile', 'sublinefield'),
  asideField: spotFieldProperty('Rechts', 'asidefield'),
  avatarField: spotFieldProperty('Avatar', 'avatarfield'),
}

export type TableValues = ValuesOf<typeof tableProperties>

// The places of a card, bound on the canvas while the table is a list.
export const CARD_SPOTS = [
  { prop: 'heading', name: 'Titel', several: true, when: AS_LIST },
  { prop: 'subline', name: 'Unterzeile', several: true, when: AS_LIST },
  { prop: 'aside', name: 'Rechts', several: true, when: AS_LIST },
] as const
