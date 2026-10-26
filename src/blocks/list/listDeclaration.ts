import { booleanProperty, type ValuesOf } from '../../core/block/property'
import { DAY_FIELD_PROPERTY } from '../../core/block/dayFieldProperty'
import type { Capability, EventDef } from '../../core/block/capability'
import type { ListBinding } from '../../core/block/listBinding'
import { columnsProperty } from '../parts/column'
import { KEY_F4, ROW_DOUBLE, ROW_CHOSEN } from './rowActivation'

export const LIST_GRID = { startWidth: 48, startHeight: 14, minWidth: 12, minHeight: 4, grows: true }

export function listProperties(sortsByClick: boolean) {
  return {
    columns: columnsProperty(),
    search: booleanProperty({
      default: false,
      label: 'Suchzeile',
      place: 'display',
      attribute: 'search',
    }),
    paging: booleanProperty({
      default: true,
      label: 'Blättern',
      place: 'display',
      attribute: 'paging',
    }),
    sortByClick: booleanProperty({
      default: sortsByClick,
      label: 'Sortieren per Klick',
      place: 'display',
      attribute: 'sortbyclick',
    }),
    columnPicker: booleanProperty({
      default: false,
      label: 'Spaltenwahl',
      place: 'display',
      attribute: 'columnpicker',
    }),
    dayField: DAY_FIELD_PROPERTY,
  }
}

type ListValues = ValuesOf<ReturnType<typeof listProperties>>

export type ListSettings = Omit<ListValues, 'columns'>

// What a row of a list can start: the table, the capture block and the data
// list offer the same.
export const LIST_EVENTS: readonly EventDef[] = [
  { key: ROW_CHOSEN, name: 'Zeile gewählt' },
  { key: ROW_DOUBLE, name: 'Zeile doppelt geklickt' },
  { key: KEY_F4, name: 'F4 – Aktion an der Zeile' },
]

export function listCapabilities<K extends string>(
  binding: ListBinding<unknown, K>,
  source: Capability<K> = { kind: 'source' },
  ownEvents: readonly EventDef[] = [],
): Capability<K>[] {
  return [
    source,
    { kind: 'recordPick' },
    { kind: 'followsSelection' },
    { kind: 'list', binding },
    { kind: 'events', list: [...LIST_EVENTS, ...ownEvents] },
  ]
}
