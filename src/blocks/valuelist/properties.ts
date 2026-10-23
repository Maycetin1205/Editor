import type { ValuesOf } from '../../core/block/property'
import { linesProperty } from './lines'

export const valueListProperties = {
  lines: linesProperty(),
}

export type ValueListValues = ValuesOf<typeof valueListProperties>
