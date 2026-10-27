import { booleanProperty, choiceProperty, textProperty, type ValuesOf } from '../../core/block/property'

export const tabsProperties = {
  appearance: choiceProperty(
    [
      { value: 'box', name: 'Kasten' },
      { value: 'plain', name: 'Frei' },
    ],
    {
      default: 'box',
      label: 'Form',
      place: 'look',
      attribute: 'appearance',
    },
  ),
  remember: booleanProperty({
    default: false,
    label: 'Letzten Reiter merken',
    attribute: 'remember',
  }),
}

export type TabsValues = ValuesOf<typeof tabsProperties>

export const tabProperties = {
  name: textProperty({
    default: 'Seite',
    label: 'Titel',
    place: 'block',
    attribute: 'name',
  }),
}

export type TabValues = ValuesOf<typeof tabProperties>
