import { describe, expect, it } from 'vitest'
import { SuggestionState } from '../src/blocks/lookup/suggestionState'

// The keys of a field that looks up (no jumping between rows, as the
// capture has it).
function inField(fieldEmpty: boolean, listOpen = false) {
  const state = new SuggestionState()
  if (listOpen) state.show([{ display: 'Charge', value: '1' }])
  return (key: string) =>
    state.actionFor(key, { listOpen, fieldEmpty, typed: false, lookupable: true, hasRecords: () => true, jumps: false })
}

describe('keys of the lookup field', () => {
  it('lists with arrow down only when the field holds something', () => {
    expect(inField(true)('ArrowDown')).toBe('nothing')
    expect(inField(false)('ArrowDown')).toBe('openList')
    expect(inField(false, true)('ArrowDown')).toBe('markDown')
  })

  it('opens the window with Enter in an empty field and goes on with a value', () => {
    expect(inField(true)('Enter')).toBe('window')
    expect(inField(false)('Enter')).toBe('nothing')
  })
})
