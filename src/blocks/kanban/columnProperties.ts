import { booleanProperty, segmentProperty, textProperty } from '../../core/block/property'
import { toneProperty } from '../look/look'

// What a column and a place of the board declare. Saved and exported masks
// depend on the keys, attributes and defaults.
export const kanbanPlaceProperties = {
  name: textProperty({
    default: 'Platz',
    label: 'Name',
    place: 'block',
    attribute: 'name',
  }),
  value: textProperty({
    default: '',
    label: 'Wert',
    attribute: 'value',
    nameFromParentField: 'columnsField',
  }),
  subtitle: textProperty({
    default: '',
    label: 'Zusatz',
    attribute: 'subtitle',
  }),
}

export const kanbanColumnProperties = {
  heading: textProperty({
    default: 'Neue Spalte',
    label: 'Titel',
    place: 'block',
    attribute: 'heading',
  }),
  button: textProperty({
    default: '',
    label: 'Knopftext',
    place: 'block',
    attribute: 'button',
  }),
  buttonKind: segmentProperty(
    [
      { value: 'none', name: 'Aus' },
      { value: 'next', name: 'Weiter' },
      { value: 'action', name: 'Aktion' },
    ],
    {
      default: 'none',
      label: 'Knopf',
      attribute: 'buttonkind',
    },
  ),
  byTime: booleanProperty({
    default: false,
    label: 'Nach Uhrzeit',
    attribute: 'bytime',
    needsSource: true,
  }),
  tone: toneProperty(),
  catchAll: booleanProperty({
    default: false,
    label: 'Auffangspalte',
    attribute: 'catchall',
    needsSource: true,
    onlyUnderSiblings: true,
  }),
  subtitle: textProperty({
    default: '',
    label: 'Unterzeile',
    attribute: 'subtitle',
  }),
  empty: textProperty({
    default: '',
    label: 'Wenn leer',
    attribute: 'empty',
  }),
  corner: segmentProperty(
    [
      { value: 'time', name: 'Zeit' },
      { value: 'wait', name: 'Wartezeit' },
      { value: 'amount', name: 'Betrag' },
      { value: 'text', name: 'Text' },
      { value: 'none', name: 'Aus' },
    ],
    {
      default: 'time',
      label: 'Ecke der Karte',
      attribute: 'corner',
    },
  ),
  cornerText: textProperty({
    default: '',
    label: 'Text in der Ecke',
    attribute: 'cornertext',
    when: { key: 'corner', equals: 'text' },
  }),
  foot: segmentProperty(
    [
      { value: 'none', name: 'Aus' },
      { value: 'place', name: 'Platz' },
      { value: 'note', name: 'Notiz' },
      { value: 'text', name: 'Text' },
    ],
    {
      default: 'none',
      label: 'Fuß der Karte',
      attribute: 'foot',
    },
  ),
  footText: textProperty({
    default: '',
    label: 'Text im Fuß',
    attribute: 'foottext',
    when: { key: 'foot', notEquals: 'none' },
  }),
  placePick: booleanProperty({
    default: false,
    label: 'Platz wählen',
    attribute: 'placepick',
  }),
  occupancy: booleanProperty({
    default: false,
    label: 'Belegt oder frei',
    attribute: 'occupancy',
  }),
  notice: textProperty({
    default: '',
    label: 'Meldung beim Ankommen',
    attribute: 'notice',
  }),
}
