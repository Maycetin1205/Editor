import {
  booleanProperty,
  choiceProperty,
  fieldProperty,
  textProperty,
  type Condition,
  type ValuesOf,
} from '../../core/block/property'

const HEADED: Condition = { key: 'kind', equals: 'headed' }
const FOLDABLE: Condition = { key: 'kind', equals: 'headed', and: { key: 'foldable', equals: true } }
const META_TEXT: Condition = { key: 'kind', equals: 'headed', and: { key: 'meta', equals: 'text' } }
const META_FIELD: Condition = { key: 'kind', equals: 'headed', and: { key: 'meta', equals: 'field' } }
const META_COUNT: Condition = { key: 'kind', equals: 'headed', and: { key: 'meta', equals: 'count' } }

// The states leer and Fehler exist only for an area that shows a source of
// its own; without one its blocks say for themselves what they hold.
const WITH_SOURCE: Condition = { key: 'source', notEquals: '' }

export const areaProperties = {
  kind: choiceProperty(
    [
      { value: 'plain', name: 'Frei' },
      { value: 'card', name: 'Karte' },
      { value: 'headed', name: 'Karte mit Kopf' },
    ],
    { default: 'headed', label: 'Art', place: 'look', attribute: 'kind' },
  ),
  heading: textProperty({
    default: 'Bereich',
    label: 'Titel',
    place: 'block',
    attribute: 'heading',
    when: HEADED,
  }),
  meta: choiceProperty(
    [
      { value: 'none', name: 'Keiner' },
      { value: 'text', name: 'Text' },
      { value: 'field', name: 'Wert aus Feld' },
      { value: 'count', name: 'Zähler der Liste im Bereich' },
    ],
    { default: 'none', label: 'Zusatz rechts', attribute: 'meta', when: HEADED },
  ),
  metaText: textProperty({
    default: '',
    label: 'Text rechts',
    attribute: 'metatext',
    when: META_TEXT,
  }),
  metaField: fieldProperty({
    default: '',
    label: 'Wert aus',
    place: 'data',
    attribute: 'metafield',
    plainNameProp: 'metaFieldName',
    when: META_FIELD,
  }),
  metaFieldName: textProperty({
    default: '',
    label: 'Wert aus – Klarname',
    place: 'none',
    attribute: 'metafieldname',
  }),
  countWord: textProperty({
    default: 'Einträge',
    label: 'Wort nach der Zahl',
    attribute: 'countword',
    when: META_COUNT,
  }),
  foldable: booleanProperty({
    default: false,
    label: 'Klappbar',
    attribute: 'foldable',
    when: HEADED,
  }),
  startFolded: booleanProperty({
    default: false,
    label: 'Startet eingeklappt',
    attribute: 'start-folded',
    when: FOLDABLE,
  }),
  rememberFold: booleanProperty({
    default: true,
    label: 'Klappzustand merken',
    attribute: 'remember-fold',
    when: FOLDABLE,
  }),
  emptyTitle: textProperty({
    default: 'Nichts gewählt',
    label: 'Leer: Satz',
    place: 'content',
    attribute: 'emptytitle',
    when: WITH_SOURCE,
  }),
  emptyHint: textProperty({
    default: '',
    label: 'Leer: Hinweis',
    place: 'content',
    attribute: 'emptyhint',
    when: WITH_SOURCE,
  }),
  emptyButton: textProperty({
    default: '',
    label: 'Leer: Knopf',
    place: 'content',
    attribute: 'emptybutton',
    when: WITH_SOURCE,
  }),
  hideWhenEmpty: booleanProperty({
    default: false,
    label: 'Ausblenden wenn leer',
    place: 'content',
    attribute: 'hide-when-empty',
    when: WITH_SOURCE,
  }),
  offerRetry: booleanProperty({
    default: true,
    label: 'Fehler: Erneut laden anbieten',
    place: 'content',
    attribute: 'offer-retry',
    when: WITH_SOURCE,
  }),
}

export type AreaValues = ValuesOf<typeof areaProperties>
