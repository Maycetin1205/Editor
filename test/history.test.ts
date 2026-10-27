import { describe, expect, it } from 'vitest'
import { History, type EditorSnapshot } from '../src/editor/state/history'

const state = (name: string): EditorSnapshot => ({
  tree: { [name]: { id: name, type: 'root', values: {}, parentId: null, childIds: [] } },
  selectedId: null,
  dataSources: [],
  relation: [],
})

describe('History.abandon', () => {
  it('hands back the state at the start and leaves no undo step', () => {
    const history = new History()
    history.record(() => state('a'))
    history.begin(() => state('b'))
    history.record(() => state('c'))
    expect(history.abandon()).toEqual(state('b'))
    expect(history.undo(() => state('now'))).toEqual(state('a'))
    expect(history.canUndo).toBe(false)
  })
  it('puts back the redo steps the transaction cleared', () => {
    const history = new History()
    history.record(() => state('a'))
    history.undo(() => state('b'))
    expect(history.canRedo).toBe(true)
    history.begin(() => state('a'))
    expect(history.canRedo).toBe(false)
    history.abandon()
    expect(history.canRedo).toBe(true)
    expect(history.canUndo).toBe(false)
  })
  it('inside another transaction only ends the inner one', () => {
    const history = new History()
    history.begin(() => state('a'))
    history.begin(() => state('b'))
    expect(history.abandon()).toBeNull()
    history.end()
    expect(history.undo(() => state('now'))).toEqual(state('a'))
  })
})
