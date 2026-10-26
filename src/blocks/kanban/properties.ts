import { booleanProperty, fieldProperty, segmentProperty, type ValuesOf } from '../../core/block/property'
import { DAY_FIELD_PROPERTY } from '../../core/block/dayFieldProperty'
import { spotBinding } from '../parts/card'
import { kanbanColumnsProperty } from './columns'

export const kanbanProperties = {
  columnsField: fieldProperty({
    default: '',
    label: 'Einsortieren nach',
    place: 'source',
    attribute: 'columnsfield',
  }),
  // A value no column and no place takes: into the catch-all column, or the
  // card is left out, as a finished appointment. An empty value always goes
  // to the catch-all column.
  others: segmentProperty(
    [
      { value: 'catch', name: 'In Auffangspalte' },
      { value: 'hide', name: 'Ausblenden' },
    ],
    {
      default: 'catch',
      label: 'Anderer Wert',
      place: 'source',
      attribute: 'others',
      needsSource: true,
    },
  ),
  dayField: DAY_FIELD_PROPERTY,
  avatarField: spotBinding('Avatar', 'avatarfield'),
  columns: kanbanColumnsProperty(),
  summary: booleanProperty({
    default: false,
    label: 'Übersicht oben',
    attribute: 'summary',
  }),
  headingField: spotBinding('Titel', 'headingfield'),
  heading2Field: spotBinding('Titel 2', 'heading2field'),
  timeField: spotBinding('Zeit', 'timefield'),
  dateField: spotBinding('Datum', 'datefield'),
  sublineField: spotBinding('Unterzeile', 'sublinefield'),
  textField: spotBinding('Textzeile', 'textfield'),
  sinceField: spotBinding('Wartet seit', 'sincefield'),
  amountField: spotBinding('Betrag', 'amountfield'),
  noteField: spotBinding('Notiz', 'notefield'),
}

export type KanbanValues = ValuesOf<typeof kanbanProperties>

export const CARD_SPOTS = [
  { prop: 'time', name: 'Zeit', several: true },
  { prop: 'date', name: 'Datum', several: true },
  { prop: 'heading', name: 'Titel', several: true },
  { prop: 'heading2', name: 'Titel 2', several: true },
  { prop: 'subline', name: 'Unterzeile', several: true },
  { prop: 'text', name: 'Textzeile', several: true },
  { prop: 'since', name: 'Wartet seit' },
  { prop: 'amount', name: 'Betrag' },
  { prop: 'note', name: 'Notiz', several: true },
] as const

export type CardSpot = (typeof CARD_SPOTS)[number]['prop']
