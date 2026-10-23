import { choiceProperty, numberProperty, textProperty, type ValuesOf } from '../../core/block/property'

export const dividerProperties = {
  word: textProperty({
    default: '',
    label: 'Wort',
    attribute: 'word',
  }),
  direction: choiceProperty(
    [
      { value: 'horizontal', name: 'Waagerecht' },
      { value: 'vertical', name: 'Senkrecht' },
    ],
    {
      default: 'horizontal',
      label: 'Richtung',
      attribute: 'direction',
    },
  ),
  thickness: numberProperty({
    default: 1,
    min: 1,
    max: 8,
    unit: 'px',
    label: 'Dicke',
    place: 'bar',
    attribute: 'thickness',
  }),
}

export type DividerValues = ValuesOf<typeof dividerProperties>
