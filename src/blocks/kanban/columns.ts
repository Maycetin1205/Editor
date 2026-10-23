import {
  booleanProperty,
  listProperty,
  readValues,
  segmentProperty,
  textProperty,
  type Property,
} from '../../core/block/property'
import { listDefaultTitle, type ListBinding } from '../../core/block/listBinding'
import { isUnread } from '../../core/unread'
import { toneProperty } from '../look/look'

const kanbanPlaceProperties = {
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

const kanbanColumnProperties = {
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

export interface KanbanPlace {
  name: string
  value: string
  subtitle: string
}

export type ButtonKind = 'none' | 'next' | 'action'

const BUTTON_KINDS: readonly ButtonKind[] = ['none', 'next', 'action']

// What the upper right corner of a card shows in a column.
export type CardCorner = 'time' | 'wait' | 'amount' | 'text' | 'none'

const CARD_CORNERS: readonly CardCorner[] = ['time', 'wait', 'amount', 'text', 'none']

// What the foot of a card shows beside its button: the place it stands in,
// its note or a fixed text. A text before place or note leads them in.
export type CardFoot = 'none' | 'place' | 'note' | 'text'

const CARD_FEET: readonly CardFoot[] = ['none', 'place', 'note', 'text']

export interface KanbanColumn {
  heading: string
  button: string
  buttonKind: ButtonKind
  byTime: boolean
  tone: string
  catchAll: boolean
  subtitle: string
  empty: string
  corner: CardCorner
  cornerText: string
  foot: CardFoot
  footText: string
  placePick: boolean
  occupancy: boolean
  notice: string
  places: KanbanPlace[]
}

const place = (name: string): KanbanPlace => ({ name, value: '', subtitle: '' })

function column(heading: string, tone: string): KanbanColumn {
  return {
    heading,
    button: '',
    buttonKind: 'none',
    byTime: false,
    tone,
    catchAll: false,
    subtitle: '',
    empty: '',
    corner: 'time',
    cornerText: '',
    foot: 'none',
    footText: '',
    placePick: false,
    occupancy: false,
    notice: '',
    places: [place(heading)],
  }
}

function defaultKanbanColumns(): KanbanColumn[] {
  return [column('Offen', 'warning'), column('In Arbeit', 'info'), column('Fertig', 'success')]
}

function placeFrom(raw: unknown): KanbanPlace {
  const values = readValues(kanbanPlaceProperties, isUnread<KanbanPlace>(raw) ? raw : {})
  return { name: String(values.name), value: String(values.value), subtitle: String(values.subtitle) }
}

function kanbanPlacesFrom(raw: unknown): KanbanPlace[] {
  return Array.isArray(raw) ? raw.map(placeFrom) : []
}

function columnFrom(raw: unknown): KanbanColumn {
  const entry = isUnread<KanbanColumn>(raw) ? raw : {}
  const values = readValues(kanbanColumnProperties, entry)
  const heading = String(values.heading)
  const places = kanbanPlacesFrom(entry.places)
  return {
    heading,
    button: String(values.button),
    buttonKind: BUTTON_KINDS.find((k) => k === values.buttonKind) ?? 'none',
    byTime: values.byTime === true,
    tone: String(values.tone),
    catchAll: values.catchAll === true,
    subtitle: String(values.subtitle),
    empty: String(values.empty),
    corner: CARD_CORNERS.find((c) => c === values.corner) ?? 'time',
    cornerText: String(values.cornerText),
    foot: CARD_FEET.find((f) => f === values.foot) ?? 'none',
    footText: String(values.footText),
    placePick: values.placePick === true,
    occupancy: values.occupancy === true,
    notice: String(values.notice),
    places: places.length > 0 ? places : [place(heading)],
  }
}

function kanbanColumnsFrom(raw: unknown): KanbanColumn[] {
  return Array.isArray(raw) ? raw.map(columnFrom) : defaultKanbanColumns()
}

export function kanbanColumnsProperty(): Property<KanbanColumn[]> {
  return listProperty<KanbanColumn[]>(kanbanColumnsFrom, {
    default: defaultKanbanColumns(),
    label: 'Spalten',
    place: 'block',
    attribute: 'columns',
  })
}

function moved<E>(entries: readonly E[], from: number, to: number): E[] | null {
  if (from === to || entries[from] === undefined) return null
  const next = [...entries]
  const [entry] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, entry)
  return next
}

const KANBAN_PLACES_BINDING: ListBinding<KanbanPlace> = {
  prop: 'places',
  defaultTitle: 'Platz {n}',
  fieldless: true,
  entryProperties: { value: kanbanPlaceProperties.value, subtitle: kanbanPlaceProperties.subtitle },
  entries: kanbanPlacesFrom,
  titleOf: (p) => p.name,
  fieldOf: () => '',
  withTypedTitle: (p, name) => ({ ...p, name }),
  withPickedField: (p) => p,
  withoutEditorMarks: (p) => p,
  entryAdd: (places) => [...places, place(listDefaultTitle(KANBAN_PLACES_BINDING, places.length))],
  entryRemove: (places, index) => (places.length <= 1 ? null : places.filter((_, i) => i !== index)),
  entryMove: moved,
}

export const KANBAN_COLUMNS_BINDING: ListBinding<KanbanColumn, 'columns'> = {
  prop: 'columns',
  defaultTitle: 'Spalte {n}',
  fieldless: true,
  entryProperties: {
    buttonKind: kanbanColumnProperties.buttonKind,
    byTime: kanbanColumnProperties.byTime,
    tone: kanbanColumnProperties.tone,
    catchAll: kanbanColumnProperties.catchAll,
    subtitle: kanbanColumnProperties.subtitle,
    empty: kanbanColumnProperties.empty,
    corner: kanbanColumnProperties.corner,
    cornerText: kanbanColumnProperties.cornerText,
    foot: kanbanColumnProperties.foot,
    footText: kanbanColumnProperties.footText,
    placePick: kanbanColumnProperties.placePick,
    occupancy: kanbanColumnProperties.occupancy,
    notice: kanbanColumnProperties.notice,
  },
  inner: {
    binding: KANBAN_PLACES_BINDING,
    of: (c) => c.places,
    with: (c, places) => ({ ...c, places: kanbanPlacesFrom(places) }),
  },
  entries: kanbanColumnsFrom,
  titleOf: (c) => c.heading,
  fieldOf: () => '',
  withTypedTitle: (c, title) => ({ ...c, heading: title }),
  withPickedField: (c) => c,
  withoutEditorMarks: (c) => c,
  entryAdd: (entries) => [...entries, column(listDefaultTitle(KANBAN_COLUMNS_BINDING, entries.length), 'info')],
  entryRemove: (entries, index) => (entries.length <= 1 ? null : entries.filter((_, i) => i !== index)),
  entryMove: moved,
  entryHeads: true,
}
