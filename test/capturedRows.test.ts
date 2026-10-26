import { describe, expect, it } from 'vitest'
import { CapturedRows } from '../src/blocks/capture/ledger/capturedRows'

const helpers = { chosen: new Map(), byHand: new Set<string>(), picks: [] }

function rows(): CapturedRows {
  return new CapturedRows(
    () => {},
    (_kind, _key, base) => ({ status: base }),
  )
}

describe('CapturedRows.lastAdded', () => {
  it('names the corrected row, not the last one', () => {
    const list = rows()
    list.add(['a'], helpers)
    list.add(['b'], helpers)
    list.add(['c'], helpers)
    const taken = list.correctable(0)!
    expect(list.takeBack(taken)).toBe(true)
    list.add(['a2'], helpers)
    expect(list.values).toEqual([['a2'], ['b'], ['c']])
    expect(list.lastAdded).toBe(list.keyAt(0))
    expect(list.lastAdded).not.toBe(list.keyAt(2))
  })
  it('is null after a corrected row went for good', () => {
    const list = rows()
    list.add(['a'], helpers)
    list.takeBack(list.correctable(0)!)
    list.dropCorrection()
    expect(list.lastAdded).toBeNull()
  })
})
