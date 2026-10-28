import type { RefObject } from 'react'
import { LEVEL_OVER_MASK_WINDOW } from '../../widgets/Popover'
import { DEFAULT_TITLE } from '../../../blocks/parts/column'
import { fieldOf, sourcesKey, type DataSource } from '../../../core/data/dataSources'
import { widthFromLength } from '../binding/fieldWidth'
import { FieldPicker, type PickerGroup } from '../binding/FieldPicker'
import type { WindowState } from './lookupWindowState'

interface LookupColumnPickerProps {
  state: WindowState
  source: DataSource | undefined
  // The chosen column and where its head is on screen.
  slot: number
  head: { left: number; top: number; height: number }
  layer: RefObject<HTMLElement | null>
  onClose: () => void
}

// Binds a column of the lookup window to a field of its source. The column
// takes the field's name and, when the field knows it, its width.
export function LookupColumnPicker({ state, source, slot, head, layer, onClose }: LookupColumnPickerProps) {
  const column = state.columns[slot]
  if (column === undefined) return null
  const defaultTitle = DEFAULT_TITLE.replace('{n}', String(slot + 1))
  const groups: PickerGroup[] =
    source === undefined ? [] : [{ sourceId: '', name: source.name, badge: sourcesKey(source), fields: source.fields }]

  return (
    <FieldPicker
      level={LEVEL_OVER_MASK_WINDOW}
      spotLabel={column.title === '' ? defaultTitle : column.title}
      groups={groups}
      current={column.field}
      anchor={layer}
      top={head.top + head.height + 4}
      left={head.left}
      onPick={(value) => {
        const field = fieldOf(source, value)
        const plainName = field?.name ?? ''
        const width = widthFromLength(field?.length)
        const part = {
          field: value,
          title: value === '' ? defaultTitle : plainName !== '' ? plainName : value,
          ...(width === undefined ? {} : { width }),
        }
        state.setColumns(state.columns.map((s, i) => (i === slot ? { ...s, ...part } : s)))
      }}
      removeLabel="Spalte entfernen"
      onRemove={
        !state.provided && state.columns.length <= 1
          ? undefined
          : () => {
              state.setColumns(state.columns.filter((_, i) => i !== slot))
              onClose()
            }
      }
      onClose={onClose}
    />
  )
}
