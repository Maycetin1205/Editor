import { textProperty, type ValuesOf } from '../../core/block/property'
import { emphasisProperty, sizeProperty, toneProperty } from '../look/look'

export const buttonProperties = {
  label: textProperty({
    default: 'Schaltfläche',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
  }),
  tone: toneProperty({ default: 'neutral', place: 'look' }),
  emphasis: emphasisProperty({ place: 'look' }),
  size: sizeProperty({ place: 'look' }),
}

export type ButtonValues = ValuesOf<typeof buttonProperties>
