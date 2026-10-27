import {
  booleanProperty,
  choiceProperty,
  fieldProperty,
  segmentProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'

const TYPED = { key: 'pictureField', equals: '' }

const BOUND = { key: 'pictureField', notEquals: '' }

const OTHER_RELATION = { key: 'fetch', equals: 'other', and: BOUND }

export const pictureProperties = {
  // A file name of SoftEngine's image library, a path or a web address;
  // bound to a field, the field's value instead.
  picture: textProperty({
    default: '',
    label: 'Bilddatei',
    attribute: 'picture',
    when: TYPED,
  }),
  fit: segmentProperty(
    [
      { value: 'contain', name: 'Einpassen' },
      { value: 'cover', name: 'Füllen' },
    ],
    {
      default: 'contain',
      label: 'Größe',
      place: 'look',
      attribute: 'fit',
    },
  ),
  align: segmentProperty(
    [
      { value: 'left', name: 'Links' },
      { value: 'center', name: 'Mitte' },
      { value: 'right', name: 'Rechts' },
    ],
    {
      default: 'center',
      label: 'Ausrichtung',
      place: 'look',
      attribute: 'align',
    },
  ),
  rounded: booleanProperty({
    default: false,
    label: 'Runde Ecken',
    place: 'look',
    attribute: 'rounded',
  }),
  description: textProperty({
    default: '',
    label: 'Beschreibung',
    attribute: 'description',
  }),
  pictureField: fieldProperty({
    default: '',
    label: 'Bildfeld',
    place: 'none',
    attribute: 'picturefield',
  }),
  // The field holds the picture itself, or a number SoftEngine turns into
  // one when asked by a relation (see address.ts).
  fetch: choiceProperty(
    [
      { value: 'field', name: 'Feld enthält das Bild' },
      { value: '1911', name: 'Artikelbild (Relation 1911)' },
      { value: '1912', name: 'Medienbild (Relation 1912)' },
      { value: 'other', name: 'Andere Relation' },
    ],
    {
      default: 'field',
      label: 'Bild holen',
      place: 'data',
      attribute: 'fetch',
      when: BOUND,
    },
  ),
  relationNr: textProperty({
    default: '',
    label: 'Relation',
    place: 'data',
    attribute: 'relationnr',
    when: OTHER_RELATION,
  }),
  moreValues: textProperty({
    default: '',
    label: 'Weitere Werte',
    place: 'data',
    attribute: 'morevalues',
    when: OTHER_RELATION,
  }),
}

export type PictureValues = ValuesOf<typeof pictureProperties>
