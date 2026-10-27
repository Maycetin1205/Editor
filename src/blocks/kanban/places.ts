import { maskHost } from '../../runtime/host'
import type { KanbanColumn, KanbanPlace } from './columns'

export interface BoardCell {
  column: number
  place: number
}

export const sameCell = (a: BoardCell, b: BoardCell): boolean => a.column === b.column && a.place === b.place

export function placeValue(column: KanbanColumn, place: KanbanPlace): string {
  const value = place.value.trim()
  if (value !== '') return value
  return column.places.length === 1 ? column.heading : place.name
}

export function placeAt(columns: readonly KanbanColumn[], spot: BoardCell): KanbanPlace | undefined {
  return columns[spot.column]?.places[spot.place]
}

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

// Where a row stands on the board; null when its value has no column or
// place and such values are left out.
export function cellOf(
  columns: readonly KanbanColumn[],
  field: string,
  row: unknown,
  hideOthers: boolean,
): BoardCell | null {
  const value = field === '' ? '' : maskHost().readField(row, field)
  if (value.trim() !== '') {
    for (const [c, column] of columns.entries()) {
      const p = column.places.findIndex((place) => same(placeValue(column, place), value))
      if (p >= 0) return { column: c, place: p }
    }
    if (hideOthers) return null
  }
  return {
    column: Math.max(
      0,
      columns.findIndex((c) => c.catchAll),
    ),
    place: 0,
  }
}
