import { fieldProperty, sourceProperty, type Property } from './property'

// Properties several blocks declare alike: the data source, and the field a
// list filters by against the chosen day of the mask.

export const SOURCE_PROP = 'source'

export const SOURCE_PROPERTY: Property<string> = sourceProperty({
  default: '',
  label: 'Datenquelle',
  place: 'none',
  attribute: SOURCE_PROP,
})

export interface SourceValue {
  source: string
}

export const DAY_FIELD_PROPERTY: Property<string> = fieldProperty({
  default: '',
  label: 'Tag filtern nach',
  place: 'data',
  attribute: 'dayfield',
})
