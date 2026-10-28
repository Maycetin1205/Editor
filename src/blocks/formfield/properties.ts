import {
  booleanProperty,
  choiceProperty,
  fieldProperty,
  listProperty,
  numberProperty,
  sourceProperty,
  textProperty,
  type Condition,
  type ValuesOf,
} from '../../core/block/property'
import type { Column } from '../parts/column'
import { coerceLookupColumns } from '../lookup/lookup'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../dialog/DialogFrame'
import { symbolProperty } from '../look/symbol'

export const FIELD_TYPES = [
  'text',
  'multiline',
  'number',
  'date',
  'time',
  'select',
  'group',
  'checkbox',
  'search',
  'day',
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export const ONLY_LOOKUP: Condition<'lookup'> = { key: 'lookup', equals: true }

const NOT_CHECKBOX: Condition = { key: 'fieldType', notEquals: 'checkbox' }

// A checkbox always holds a value; the Tagwahl always holds a day.
export const MAY_BE_REQUIRED: Condition = { key: 'fieldType', noneOf: ['checkbox', 'day'] }

// A search field filters the lists of the mask, a Tagwahl chooses its day;
// neither holds a field value.
export const WITH_VALUE: Condition<'lookup' | 'fieldType'> = {
  key: 'lookup',
  notEquals: true,
  and: { key: 'fieldType', noneOf: ['search', 'day'] },
}

// The entries of a choice, as the options name them: separated by commas.
export function optionsOf(text: string): string[] {
  return text
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== '')
}

export const TICKED = 'J'
export const UNTICKED = 'N'

export const formFieldProperties = {
  fieldType: choiceProperty(
    [
      { value: 'text', name: 'Text' },
      { value: 'multiline', name: 'Mehrzeilig' },
      { value: 'number', name: 'Zahl' },
      { value: 'date', name: 'Datum' },
      { value: 'time', name: 'Uhrzeit' },
      { value: 'select', name: 'Auswahl' },
      { value: 'group', name: 'Auswahlgruppe' },
      { value: 'checkbox', name: 'Ankreuzfeld' },
      { value: 'search', name: 'Suche' },
      { value: 'day', name: 'Tagwahl' },
    ],
    {
      default: 'text',
      label: 'Feldtyp',
      attribute: 'fieldtype',
    },
  ),
  lookup: booleanProperty({
    default: false,
    label: 'Nachschlagen',
    attribute: 'lookup',
    when: { key: 'fieldType', equals: 'text' },
    preset: { by: 'fieldType' },
  }),
  showLabel: booleanProperty({
    default: true,
    label: 'Beschriftung',
    place: 'look',
    attribute: 'showlabel',
  }),
  symbol: symbolProperty({ place: 'look', when: NOT_CHECKBOX }),
  label: textProperty({
    default: 'Feldname',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
  }),
  lines: numberProperty({
    default: 3,
    min: 2,
    max: 12,
    label: 'Zeilen',
    attribute: 'lines',
    when: { key: 'fieldType', equals: 'multiline' },
  }),
  options: textProperty({
    default: '',
    label: 'Auswahl-Optionen',
    attribute: 'options',
    when: { key: 'fieldType', equals: 'select', otherwise: { key: 'fieldType', equals: 'group' } },
  }),
  value: textProperty({
    default: '',
    label: 'Wert',
    place: 'none',
    attribute: 'value',
  }),
  valueField: fieldProperty({
    default: '',
    label: 'Feld',
    place: 'data',
    attribute: 'valuefield',
    when: WITH_VALUE,
  }),
  lookupSource: sourceProperty({
    default: '',
    label: 'Quelle',
    place: 'lookup',
    attribute: 'lookupsource',
    when: ONLY_LOOKUP,
  }),
  storageField: fieldProperty({
    default: '',
    label: 'Gespeichert wird',
    place: 'lookup',
    attribute: 'storagefield',
    sourceProp: 'lookupSource',
    plainNameProp: 'storageTitle',
    when: ONLY_LOOKUP,
  }),
  storageTitle: textProperty({
    default: '',
    label: 'Gespeichert wird — Klarname',
    place: 'none',
    attribute: 'storagetitle',
  }),
  lookupColumns: listProperty<Column[]>(coerceLookupColumns, {
    default: [],
    label: 'Spalten im Fenster',
    place: 'none',
    attribute: 'lookupcolumns',
  }),
  windowWidth: numberProperty({
    default: WINDOW_WIDTH,
    label: 'Fensterbreite',
    place: 'none',
    attribute: 'lookupwidth',
  }),
  windowHeight: numberProperty({
    default: WINDOW_HEIGHT,
    label: 'Fensterhöhe',
    place: 'none',
    attribute: 'lookupheight',
  }),
  onlyHit: booleanProperty({
    default: false,
    label: 'Einzigen Treffer übernehmen',
    place: 'lookup',
    attribute: 'onlyhit',
    when: ONLY_LOOKUP,
  }),

  required: booleanProperty({
    default: false,
    label: 'Pflicht',
    place: 'content',
    attribute: 'required',
    when: MAY_BE_REQUIRED,
  }),
}

export type FormFieldValues = ValuesOf<typeof formFieldProperties>
