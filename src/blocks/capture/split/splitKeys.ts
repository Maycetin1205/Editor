import { keyIntent, type KeyPress } from '../keys'
import type { SplitState } from './splitState'

type SplitKey = 'done' | 'back' | 'blocked' | 'handled' | 'nothing'

// Rows a page key moves the mark.
const PAGE = 8

// Digits and the comma type the amount; any other letter searches the rows.
const AMOUNT_CHAR = /[0-9,]/

export function splitKey(state: SplitState, e: KeyPress, now: number = Date.now()): SplitKey {
  const outcome = keyOutcome(state, e, now)
  state.setBlocked(outcome === 'blocked')
  return outcome
}

function keyOutcome(state: SplitState, e: KeyPress, now: number): SplitKey {
  const last = state.rows.length - 1
  switch (keyIntent(e)) {
    case 'down':
      state.setMark(Math.min(last, state.mark + 1))
      return 'handled'
    case 'up':
      state.setMark(Math.max(0, state.mark - 1))
      return 'handled'
    case 'pageDown':
      state.setMark(Math.min(last, state.mark + PAGE))
      return 'handled'
    case 'pageUp':
      state.setMark(Math.max(0, state.mark - PAGE))
      return 'handled'
    case 'home':
      state.setMark(0)
      return 'handled'
    case 'end':
      state.setMark(last)
      return 'handled'
    case 'space':
      state.toggle(state.mark)
      return 'handled'
    case 'delete':
      state.dropMarked()
      return 'handled'
    case 'backspace':
      state.backspace()
      return 'handled'
    case 'enter':
    case 'tab':
    case 'backTab':
      state.stopEditing()
      return state.ready ? 'done' : 'blocked'
    case 'escape':
      if (!state.editing) return 'back'
      state.stopEditing()
      return 'handled'
    case 'char':
      if (AMOUNT_CHAR.test(e.key)) state.typeChar(e.key)
      else state.seek(e.key, now)
      return 'handled'
    default:
      return 'nothing'
  }
}
