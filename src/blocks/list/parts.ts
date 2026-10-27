import { unsafeCSS, type CSSResult } from 'lit'

// The class names of the table that more than the list relies on: the capture
// block draws its rows into the body with them and styles and finds them, the
// lookup finds its table, renaming a column in the editor starts at its head
// text. The list draws and styles them from here, so a rename cannot miss one
// of its own places.
export const TABLE_PART = {
  table: 'table',
  // A table drawn as a plain list: no head, no foot, one column (the data list).
  plain: 'plain',
  body: 'body',
  head: 'head',
  headText: 'head-text',
  row: 'row',
  ruler: 'ruler',
  // The row the operator chose (in the editor, selected is the marked block).
  chosen: 'chosen',
  subline: 'subline',
  sub: 'sub',
  right: 'right',
  hidden: 'hidden',
  typable: 'typable',
  held: 'held',
  // The typing cell a block puts into a row: the list leaves its clicks and
  // keys alone and sizes it in the grey line.
  cellHolder: 'cell-holder',
  cellInput: 'cell-input',
} as const

type TablePart = keyof typeof TABLE_PART

// The same names for css``, which takes no plain text: `.${row}`.
export const TABLE_PART_CSS = Object.fromEntries(
  Object.entries(TABLE_PART).map(([part, name]) => [part, unsafeCSS(name)]),
) as Record<TablePart, CSSResult>
