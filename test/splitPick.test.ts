import { describe, expect, it } from 'vitest'
import { checkParameterBinding, type PickValues, type RuntimeValues } from '../src/core/data/actions'
import { parameterResolve } from '../src/softengine/relations/parameters'

const pick = (amount: string, charge: string): PickValues => ({
  amount,
  read: (field) => (field === 'CHA_1_25' ? charge : ''),
})

const values: RuntimeValues = {
  context: {},
  previousResult: '',
  pick: pick('9', 'LAUFEND'),
  picks: [pick('2', 'CHARGE-1'), pick('3', 'CHARGE-2')],
}

describe('splitCell with a row number', () => {
  it('reads the named distributed row', () => {
    expect(parameterResolve({ source: 'splitCell', value: 'CHA_1_25', pick: 1 }, values)).toBe('CHARGE-2')
    expect(parameterResolve({ source: 'splitCell', value: '', pick: 0 }, values)).toBe('2')
  })

  it('is empty past the last distributed row', () => {
    expect(parameterResolve({ source: 'splitCell', value: 'CHA_1_25', pick: 4 }, values)).toBe('')
  })

  it('reads the current row without a number', () => {
    expect(parameterResolve({ source: 'splitCell', value: 'CHA_1_25' }, values)).toBe('LAUFEND')
  })

  it('keeps the number only on splitCell', () => {
    expect(checkParameterBinding({ source: 'splitCell', value: '', pick: 2 })).toEqual({
      source: 'splitCell',
      value: '',
      pick: 2,
    })
    expect(checkParameterBinding({ source: 'fixed', value: 'x', pick: 2 })).toEqual({ source: 'fixed', value: 'x' })
  })
})
