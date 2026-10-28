import {
  booleanProperty,
  choiceProperty,
  fieldProperty,
  ladderProperty,
  numberProperty,
  segmentProperty,
  textProperty,
  type Condition,
  type ValuesOf,
} from '../../core/block/property'
import { calculationsProperty } from '../../core/data/calculation'
import { symbolProperty } from '../look/symbol'

const TEXT_SIZE_STEPS = ['12', '13', '14', '20', '22']

// A Text is words, or a divider with its words on the line.
export const AS_TEXT: Condition<'form'> = { key: 'form', notEquals: 'divider' }
const AS_DIVIDER: Condition = { key: 'form', equals: 'divider' }

const WITH_LABEL: Condition = { ...AS_TEXT, and: { key: 'showLabel', equals: true } }

const BOUND: Condition = { ...AS_TEXT, and: { key: 'textField', notEquals: '' } }

export const textProperties = {
  form: segmentProperty(
    [
      { value: 'text', name: 'Text' },
      { value: 'divider', name: 'Trennlinie' },
    ],
    {
      default: 'text',
      label: 'Form',
      place: 'content',
      attribute: 'form',
    },
  ),
  direction: choiceProperty(
    [
      { value: 'horizontal', name: 'Waagerecht' },
      { value: 'vertical', name: 'Senkrecht' },
    ],
    {
      default: 'horizontal',
      label: 'Richtung',
      place: 'look',
      attribute: 'direction',
      when: AS_DIVIDER,
    },
  ),
  thickness: numberProperty({
    default: 1,
    min: 1,
    max: 8,
    unit: 'px',
    label: 'Dicke',
    place: 'look',
    attribute: 'thickness',
    when: AS_DIVIDER,
  }),
  size: ladderProperty(
    TEXT_SIZE_STEPS.map((value) => ({ value, name: value })),
    {
      default: '13',
      min: 8,
      max: 96,
      label: 'Größe',
      place: 'look',
      attribute: 'size',
      when: AS_TEXT,
    },
  ),
  symbol: symbolProperty({ place: 'look', when: AS_TEXT }),
  align: segmentProperty(
    [
      { value: 'left', name: 'Links' },
      { value: 'center', name: 'Mitte' },
      { value: 'right', name: 'Rechts' },
    ],
    {
      default: 'left',
      label: 'Ausrichtung',
      place: 'look',
      attribute: 'align',
      when: AS_TEXT,
    },
  ),
  border: choiceProperty(
    [
      { value: 'none', name: 'Ohne' },
      { value: 'line', name: 'Linie unten' },
      { value: 'box', name: 'Kasten' },
    ],
    {
      default: 'none',
      label: 'Rahmen',
      place: 'look',
      attribute: 'border',
      when: AS_TEXT,
    },
  ),
  text: textProperty({
    default: 'Text',
    label: 'Text',
    place: 'block',
    attribute: 'text',
  }),
  showLabel: booleanProperty({
    default: false,
    label: 'Beschriftung',
    place: 'look',
    attribute: 'showlabel',
    when: AS_TEXT,
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
    place: 'look',
    attribute: 'bold',
    when: AS_TEXT,
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
    place: 'content',
    attribute: 'emptytext',
    when: BOUND,
  }),
  replace: textProperty({
    default: '',
    label: 'Werte ersetzen',
    place: 'content',
    attribute: 'replace',
    when: BOUND,
  }),
  calculations: calculationsProperty,
}

export type TextValues = ValuesOf<typeof textProperties>
