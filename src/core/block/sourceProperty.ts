import { sourceProperty, type Property } from './property'

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
