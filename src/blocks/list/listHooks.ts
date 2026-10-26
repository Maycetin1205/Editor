import { nothing, type TemplateResult } from 'lit'
import type { Column, ColumnView, ColumnsGrid } from '../parts/column'
import type { RowLayout } from '../parts/cell'

// What a block built on the list (the capture block) adds to it: its own cell
// values, a look per row, required and held columns, the grey line and rows
// below the records.

export interface RowDecoration {
  status: string

  className: string

  cell: (slot: number, column: Column, value: string) => TemplateResult | null

  right: TemplateResult | typeof nothing

  key: (e: KeyboardEvent) => boolean
}

export const WITHOUT_DECORATION: RowDecoration = {
  status: '',
  className: '',
  cell: () => null,
  right: nothing,
  key: () => false,
}

export interface RowsBelow {
  count: number

  render: (placement: {
    view: ColumnView
    cols: ColumnsGrid
    layout: RowLayout
    rulerTicks: number | null
  }) => TemplateResult
}

export interface ListHooks {
  cellValue: (rawIndex: number, slot: number) => string

  decoration: () => (rawIndex: number | null) => RowDecoration

  required: (slot: number) => boolean

  held: (slot: number) => boolean

  greyLine: (shown: readonly number[]) => ReadonlyMap<number, number>

  bottom: () => RowsBelow | null
}
