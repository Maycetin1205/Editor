import { describe, expect, it } from 'vitest'
import { entryMoved } from '../src/core/block/listBinding'
import { STATES_BINDING } from '../src/blocks/status/properties'

describe('STATES_BINDING.entries', () => {
  it('reads the states a mask file holds and fills what is missing', () => {
    expect(STATES_BINDING.entries([{ word: 'Gebucht', value: 'B', tone: 'success' }, { value: 'S' }, 7])).toEqual([
      { word: 'Gebucht', value: 'B', tone: 'success' },
      { word: 'Zustand', value: 'S', tone: 'neutral' },
      { word: 'Zustand', value: '', tone: 'neutral' },
    ])
  })

  it('starts with two states when the file holds none', () => {
    expect(STATES_BINDING.entries(undefined).map((s) => s.word)).toEqual(['Offen', 'Erledigt'])
    expect(STATES_BINDING.entries([]).map((s) => s.word)).toEqual(['Offen', 'Erledigt'])
  })
})

describe('entryMoved', () => {
  it('moves an entry and says when nothing moves', () => {
    expect(entryMoved(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(entryMoved(['a', 'b', 'c'], 2, 9)).toBeNull()
    expect(entryMoved(['a', 'b', 'c'], 5, 0)).toBeNull()
  })
})
