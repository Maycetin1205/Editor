import { fieldProperty, type Property } from './property'

export const DAY_FIELD_PROPERTY: Property<string> = fieldProperty({
  default: '',
  label: 'Tag filtern nach',
  place: 'data',
  attribute: 'dayfield',
})
