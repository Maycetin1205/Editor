// What a key means to the capture block. Modifiers count only where they
// change the meaning: Shift+Tab goes back, and a character typed with Ctrl,
// Alt or Meta is a shortcut, not text. F5 is the lookup key of SoftEngine.
export type KeyIntent =
  | 'enter'
  | 'tab'
  | 'backTab'
  | 'escape'
  | 'space'
  | 'up'
  | 'down'
  | 'pageUp'
  | 'pageDown'
  | 'home'
  | 'end'
  | 'delete'
  | 'backspace'
  | 'lookup'
  | 'insert'
  | 'char'
  | 'other'

const NAMED: ReadonlyMap<string, KeyIntent> = new Map([
  ['Enter', 'enter'],
  ['Tab', 'tab'],
  ['Escape', 'escape'],
  [' ', 'space'],
  ['ArrowUp', 'up'],
  ['ArrowDown', 'down'],
  ['PageUp', 'pageUp'],
  ['PageDown', 'pageDown'],
  ['Home', 'home'],
  ['End', 'end'],
  ['Delete', 'delete'],
  ['Backspace', 'backspace'],
  ['F5', 'lookup'],
  ['Insert', 'insert'],
])

export type KeyPress = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>

export function keyIntent(e: KeyPress): KeyIntent {
  const named = NAMED.get(e.key)
  if (named === 'tab' && e.shiftKey) return 'backTab'
  if (named !== undefined) return named
  return e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey ? 'char' : 'other'
}
