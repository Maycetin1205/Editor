import { textProperty, type ValuesOf } from '../../core/block/property'
import { calculationsProperty } from '../../core/data/calculation'
import { splitsProperty } from '../../core/data/split'
import { listProperties } from '../list'
import { captureColumnsProperty } from './column'

const list = listProperties(false)

export const captureProperties = {
  columns: captureColumnsProperty(),
  search: list.search,
  sortByClick: list.sortByClick,
  columnPicker: list.columnPicker,
  dayField: list.dayField,
  calculations: calculationsProperty,
  splits: splitsProperty,
  rowHint: textProperty({
    default: '',
    label: 'Hinweis in der Tippzeile',
    place: 'display',
    attribute: 'rowhint',
  }),
}

export type CaptureValues = ValuesOf<typeof captureProperties>
