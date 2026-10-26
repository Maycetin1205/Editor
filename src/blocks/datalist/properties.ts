import { choiceProperty, type Condition, type ValuesOf } from '../../core/block/property'
import { spotBinding } from '../parts/card'

export const dataListProperties = {
  pick: choiceProperty(
    [
      { value: 'one', name: 'Eine Zeile' },
      { value: 'none', name: 'Keine' },
    ],
    {
      default: 'one',
      label: 'Auswahl',
      attribute: 'pick',
    },
  ),
  headingField: spotBinding('Titel', 'headingfield'),
  sublineField: spotBinding('Unterzeile', 'sublinefield'),
  asideField: spotBinding('Rechts', 'asidefield'),
  avatarField: spotBinding('Avatar', 'avatarfield'),
}

export type DataListValues = ValuesOf<typeof dataListProperties>

export const PICK_ONE: Condition<'pick'> = { key: 'pick', equals: 'one' }

export const ROW_SPOTS = [
  { prop: 'heading', name: 'Titel', several: true },
  { prop: 'subline', name: 'Unterzeile', several: true },
  { prop: 'aside', name: 'Rechts', several: true },
] as const
