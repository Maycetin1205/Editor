import type { PickValues } from '../actions'
import { isUnread } from '../../unread'

// The distributed rows of a capture, carried in free fields of the record a
// relation writes, through its repeated P!L!A!W places: each row its value
// and its amount side by side, from field `start` on. SoftEngine takes at
// most 16 such places, so at most 8 rows. The place `mark` says J when rows
// came along and N when none did.
export interface PickSpread {
  blockId: string
  field: string
  start: number
  rows: number
  mark: string
}

export const SPREAD_ROWS_MAX = 8

const SPREAD_AMOUNT_LENGTH = 10

const GROUP = ['P', 'L', 'A', 'W']

// The length a field code like CHA_1_25 names; 0 when it names none.
export function fieldLength(field: string): number {
  const length = /_\d+_(\d+)$/.exec(field)?.[1]
  return length === undefined ? 0 : Number(length)
}

export function spreadRead(raw: unknown): { spread?: PickSpread } {
  if (!isUnread<PickSpread>(raw)) return {}
  const { blockId, field, start, rows, mark } = raw
  if (typeof blockId !== 'string' || blockId === '') return {}
  if (typeof field !== 'string' || fieldLength(field) === 0) return {}
  if (typeof mark !== 'string') return {}
  if (!Number.isInteger(start) || Number(start) < 1) return {}
  if (!Number.isInteger(rows) || Number(rows) < 1 || Number(rows) > SPREAD_ROWS_MAX) return {}
  return { spread: { blockId, field, start: Number(start), rows: Number(rows), mark } }
}

// Whether a relation ends in the place group a spread fills.
export function spreadFits(relation: { parameter: readonly string[]; extraParameterAllowed?: boolean }): boolean {
  return relation.extraParameterAllowed === true && relation.parameter.slice(-GROUP.length).join() === GROUP.join()
}

// The values of a relation call with the spread rows: the first group takes
// the relation's own P!L!A!W places when they are empty, the rest follow
// the step's own extra places.
export function spreadParams(
  params: readonly string[],
  names: readonly string[],
  spread: PickSpread,
  picks: readonly PickValues[],
): string[] {
  const length = fieldLength(spread.field)
  const groups = picks.flatMap((pick, k) => {
    const at = spread.start + k * (length + SPREAD_AMOUNT_LENGTH)
    return [
      [String(at), String(length), 'L', pick.read(spread.field)],
      [String(at + length), String(SPREAD_AMOUNT_LENGTH), 'R', pick.amount],
    ]
  })
  const out = [...params]
  const mark = names.indexOf(spread.mark)
  if (mark >= 0) out[mark] = picks.length > 0 ? 'J' : 'N'
  const own = names.length - GROUP.length
  if (groups.length > 0 && out.slice(own, names.length).every((v) => v === '')) {
    out.splice(own, GROUP.length, ...groups[0])
    return [...out, ...groups.slice(1).flat()]
  }
  return [...out, ...groups.flat()]
}
