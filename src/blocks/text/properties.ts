import {
  booleanProperty,
  choiceProperty,
  fieldProperty,
  ladderProperty,
  segmentProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'
import { calculationsProperty } from '../../core/data/calculation'
import { symbolProperty } from '../look/symbol'

const TEXT_SIZE_STEPS = ['12', '13', '14', '20', '22']

const WITH_LABEL = { key: 'showLabel', equals: true }

const BOUND = { key: 'textField', notEquals: '' }

export const textProperties = {
  size: ladderProperty(TEXT_SIZE_STEPS.map((value) => ({ value, name: value })), {
    default: '13',
    min: 8,
    max: 96,
    label: 'Größe',
    place: 'font',
    attribute: 'size',
  }),
  symbol: symbolProperty(),
  align: segmentProperty([
    { value: 'left', name: 'Links' },
    { value: 'center', name: 'Mitte' },
    { value: 'right', name: 'Rechts' },
  ], {
    default: 'left',
    label: 'Ausrichtung',
    attribute: 'align',
  }),
  border: choiceProperty([
    { value: 'none', name: 'Ohne' },
    { value: 'line', name: 'Linie unten' },
    { value: 'box', name: 'Kasten' },
  ], {
    default: 'none',
    label: 'Rahmen',
    attribute: 'border',
  }),
  text: textProperty({
    default: 'Text',
    label: 'Text',
    place: 'block',
    attribute: 'text',
  }),
  showLabel: booleanProperty({
    default: false,
    label: 'Beschriftung',
    attribute: 'showlabel',
  }),
  label: textProperty({
    default: '',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
    when: WITH_LABEL,
  }),
  bold: booleanProperty({
    default: false,
    label: 'Fett',
    attribute: 'bold',
  }),
  textField: fieldProperty({
    default: '',
    label: 'Textfeld',
    place: 'none',
    attribute: 'textfield',
  }),
  // The words with the fields woven in (core/block/fieldPattern.ts); empty
  // while the text is typed words only or the values of its fields only.
  pattern: textProperty({
    default: '',
    label: 'Text mit Feldern',
    place: 'none',
    attribute: 'pattern',
  }),
  emptyText: textProperty({
    default: '',
    label: 'Wenn leer',
    place: 'display',
    attribute: 'emptytext',
    when: BOUND,
  }),
  replace: textProperty({
    default: '',
    label: 'Werte ersetzen',
    place: 'display',
    attribute: 'replace',
    when: BOUND,
  }),
  calculations: calculationsProperty,
}

export type TextValues = ValuesOf<typeof textProperties>
