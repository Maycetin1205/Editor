import { describe, expect, it } from 'vitest'
import type { PickValues } from '../src/core/data/actions'
import { relation } from '../src/core/data/steps/relation'
import { spreadParams, spreadRead, type PickSpread } from '../src/core/data/steps/spread'

const NAMES = ['BELNR', 'ARTNR', 'CHANR', 'P', 'L', 'A', 'W']
const spread: PickSpread = { blockId: 'cap', field: 'CHA_1_25', start: 4610, rows: 8, mark: 'CHANR' }
const pick = (charge: string, amount: string): PickValues => ({
  amount,
  read: (field) => (field === 'CHA_1_25' ? charge : ''),
})

describe('distributed rows in free fields', () => {
  it('fills the own place group first, then follows it', () => {
    const params = spreadParams(['4711', '6012', '', '', '', '', ''], NAMES, spread, [pick('C1', '3'), pick('C2', '2')])
    expect(params).toEqual([
      ...['4711', '6012', 'J'],
      ...['4610', '25', 'L', 'C1'],
      ...['4635', '10', 'R', '3'],
      ...['4645', '25', 'L', 'C2'],
      ...['4670', '10', 'R', '2'],
    ])
  })

  it('leaves a used own group alone', () => {
    const params = spreadParams(['4711', '6012', '', '1', '2', 'L', 'x'], NAMES, spread, [pick('C1', '3')])
    expect(params.slice(3)).toEqual(['1', '2', 'L', 'x', '4610', '25', 'L', 'C1', '4635', '10', 'R', '3'])
  })

  it('says N without rows', () => {
    expect(spreadParams(['4711', '6012', 'J', '', '', '', ''], NAMES, spread, [])).toEqual([
      ...['4711', '6012', 'N'],
      ...['', '', '', ''],
    ])
  })

  it('reads only a usable setting', () => {
    expect(spreadRead(spread)).toEqual({ spread })
    expect(spreadRead({ ...spread, rows: 9 })).toEqual({})
    expect(spreadRead({ ...spread, start: 0 })).toEqual({})
    expect(spreadRead({ ...spread, field: 'CHARGE' })).toEqual({})
  })

  it('travels through the export and back', () => {
    const step = {
      id: 's',
      kind: 'RELATION' as const,
      resultName: '',
      relationId: 'r',
      parameter: [],
      extraParameter: [],
      spread,
    }
    const refs = { popupName: () => '', stepPosition: () => '', columnsIndex: () => '' }
    const exported = relation.export(step, refs)
    expect(relation.readExported(JSON.parse(JSON.stringify(exported)), '')?.spread).toEqual(spread)
    expect(relation.export({ ...step, spread: { ...spread, start: 0 } }, refs).spread).toBeUndefined()
  })
})
