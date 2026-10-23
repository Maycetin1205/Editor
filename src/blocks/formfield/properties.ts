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

export const FIELD_TYPES = ['text', 'number', 'date', 'time', 'select', 'checkbox', 'search'] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export const ONLY_LOOKUP: Condition<'lookup'> = { key: 'lookup', equals: true }

export const NOT_CHECKBOX: Condition = { key: 'fieldType', notEquals: 'checkbox' }

// A search field filters the boards of the mask; it holds no field value.
export const WITH_VALUE: Condition<'lookup' | 'fieldType'> = {
  key: 'lookup',
  notEquals: true,
  and: { key: 'fieldType', notEquals: 'search' },
}

export const TICKED = 'J'
export const UNTICKED = 'N'

export const formFieldProperties = {
  fieldType: choiceProperty([
    { value: 'text', name: 'Text' },
    { value: 'number', name: 'Zahl' },
    { value: 'date', name: 'Datum' },
    { value: 'time', name: 'Uhrzeit' },
    { value: 'select', name: 'Auswahl' },
    { value: 'checkbox', name: 'Ankreuzfeld' },
    { value: 'search', name: 'Suche' },
  ], {
    default: 'text',
    label: 'Feldtyp',
    attribute: 'fieldtype',
  }),
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
    attribute: 'showlabel',
  }),
  symbol: symbolProperty({ when: NOT_CHECKBOX }),
  label: textProperty({
    default: 'Feldname',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
  }),
  options: textProperty({
    default: '',
    label: 'Auswahl-Optionen',
    attribute: 'options',
    when: { key: 'fieldType', equals: 'select' },
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
    place: 'source',
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
    place: 'display',
    attribute: 'required',
    when: NOT_CHECKBOX,
  }),
}

export type FormFieldValues = ValuesOf<typeof formFieldProperties>
