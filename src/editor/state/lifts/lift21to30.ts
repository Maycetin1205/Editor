import { splitBinding } from '../../../core/block/binding'
import { numberText } from '../../../core/data/number'
import { isPlainObject } from './plain'

// Schema steps 21 to 30. Each step rewrites a tree of the step before it in
// place; liftState runs them in order.

const OLD_TEXT_SIZE = 14

function textVariant(values: Record<string, unknown>): string {
  const size = typeof values.size === 'number' ? values.size : OLD_TEXT_SIZE
  if (values.weight === 'bold') return size >= 15 ? 'title' : 'heading'
  if (size <= 11.5) return 'label'
  if (values.color === 'muted') return 'muted'
  return 'body'
}

export function liftTo21(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values)) continue
    const values = node.values
    if (node.type === 'text') {
      values.variant = textVariant(values)
      delete values.size
      delete values.weight
      delete values.color
    }
    if (node.type === 'formfield' && values.appearance === 'line') values.appearance = 'plain'
  }
}

export function liftTo22(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'formfield' || !isPlainObject(node.values)) continue
    const values = node.values
    if (values.fieldType === 'lookup') values.lookup = true
    if (values.fieldType === 'lookup' || values.fieldType === 'textarea') values.fieldType = 'text'
  }
}

const COLUMN_VALUES_23 = ['heading', 'tone', 'catchAll', 'button']
const CARD_VALUES_23 = [
  'chipTone',
  'heading',
  'heading2',
  'time',
  'date',
  'subline',
  'text',
  'chip',
  'headingField',
  'heading2Field',
  'timeField',
  'dateField',
  'sublineField',
  'textField',
  'chipField',
]

function picked(values: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isPlainObject(values)) return {}
  return Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, values[key]]))
}

export function liftTo23(tree: unknown): void {
  if (!isPlainObject(tree)) return
  const drop = (id: unknown): void => {
    if (typeof id !== 'string') return
    const node = tree[id]
    if (isPlainObject(node) && Array.isArray(node.childIds)) node.childIds.forEach(drop)
    delete tree[id]
  }
  for (const board of Object.values(tree)) {
    if (!isPlainObject(board) || board.type !== 'kanban' || !Array.isArray(board.childIds)) continue
    const values = isPlainObject(board.values) ? board.values : {}
    const children = board.childIds.map((id) => (typeof id === 'string' ? tree[id] : undefined)).filter(isPlainObject)
    const columns = children
      .filter((child) => child.type === 'kanban-column')
      .map((child) => {
        const own = isPlainObject(child.values) ? child.values : {}
        return {
          ...picked(own, COLUMN_VALUES_23),
          places: [{ ...picked(own, ['value']), ...('heading' in own ? { name: own.heading } : {}) }],
        }
      })
    if (columns.length > 0) values.columns = columns
    const card = children.find((child) => child.type === 'card')
    if (card) Object.assign(values, picked(card.values, CARD_VALUES_23))
    board.values = values
    board.childIds.forEach(drop)
    board.childIds = []
  }
}

const OLD_AREA_COLUMNS = 48

function cellOf(values: Record<string, unknown>, key: string, fallback: number): number {
  const v = values[key]
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback
}

export function liftTo24(tree: unknown): void {
  if (!isPlainObject(tree)) return
  const carry = (id: unknown): void => {
    const node = typeof id === 'string' ? tree[id] : undefined
    if (!isPlainObject(node) || !Array.isArray(node.childIds)) return
    if (node.type === 'area' && isPlainObject(node.values)) {
      const columns = Math.max(1, cellOf(node.values, 'gridW', OLD_AREA_COLUMNS))
      for (const childId of node.childIds) {
        const child = typeof childId === 'string' ? tree[childId] : undefined
        if (!isPlainObject(child) || !isPlainObject(child.values)) continue
        const x = Math.min(columns - 1, Math.round((cellOf(child.values, 'gridX', 0) * columns) / OLD_AREA_COLUMNS))
        const w = Math.max(
          1,
          Math.round((cellOf(child.values, 'gridW', OLD_AREA_COLUMNS) * columns) / OLD_AREA_COLUMNS),
        )
        child.values.gridX = x
        child.values.gridW = Math.min(w, columns - x)
      }
    }
    node.childIds.forEach(carry)
  }
  Object.entries(tree)
    .filter(([, node]) => isPlainObject(node) && (node.parentId === null || node.parentId === undefined))
    .forEach(([id]) => carry(id))
}

function termFrom25(factor: unknown, divides: boolean): Record<string, unknown> | null {
  if (!isPlainObject(factor)) return null
  if (factor.kind === 'column' && typeof factor.column === 'string' && factor.column !== '') {
    return { kind: 'row', value: factor.column, divides }
  }
  if (factor.kind === 'dataField' && typeof factor.field === 'string' && factor.field !== '') {
    const { sourceId, code } = splitBinding(factor.field)
    return { kind: 'helper', ...(sourceId === '' ? {} : { sourceId }), value: code, divides }
  }
  if (factor.kind === 'number' && typeof factor.number === 'number') {
    return { kind: 'fixed', value: numberText(factor.number, 6), divides }
  }
  return null
}

export function liftTo25(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values) || !Array.isArray(node.values.calculations)) continue
    node.values.calculations = node.values.calculations.flatMap((old: unknown) => {
      if (!isPlainObject(old) || !isPlainObject(old.lead) || typeof old.lead.column !== 'string') return []
      const factors = (list: unknown, divides: boolean) =>
        (Array.isArray(list) ? list : []).flatMap((f) => termFrom25(f, divides) ?? [])
      const round = isPlainObject(old.lead.round) ? old.lead.round.decimals : undefined
      return [
        {
          key: old.key,
          lead: old.lead.column,
          terms: [...factors(old.numerator, false), ...factors(old.denominator, true)],
          decimals: typeof round === 'number' ? round : 2,
        },
      ]
    })
  }
}

export function liftTo26(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'kanban' || !isPlainObject(node.values)) continue
    if (!Array.isArray(node.values.columns)) continue
    for (const column of node.values.columns) {
      if (!isPlainObject(column) || column.buttonKind !== undefined) continue
      column.buttonKind = typeof column.button === 'string' && column.button.trim() !== '' ? 'next' : 'none'
    }
  }
}

const ONE_LINE_TYPES_27 = ['formfield', 'date', 'button']
const ONE_LINE_ROWS_27 = 2

export function liftTo27(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || typeof node.type !== 'string' || !isPlainObject(node.values)) continue
    if (ONE_LINE_TYPES_27.includes(node.type)) node.values.gridH = ONE_LINE_ROWS_27
  }
}

const STANDARD_LOOK_28 = { tone: 'neutral', emphasis: 'outline' }
const BUTTON_LOOKS_28: Readonly<Record<string, { tone: string; emphasis: string }>> = {
  standard: STANDARD_LOOK_28,
  primary: { tone: 'info', emphasis: 'solid' },
  quiet: { tone: 'info', emphasis: 'soft' },
  ghost: { tone: 'neutral', emphasis: 'text' },
}

export function liftTo28(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'button' || !isPlainObject(node.values)) continue
    Object.assign(node.values, BUTTON_LOOKS_28[String(node.values.variant)] ?? STANDARD_LOOK_28)
    delete node.values.variant
  }
}

const TEXT_TONES_29: Readonly<Record<string, string>> = {
  petrol: 'info',
  blue: 'info',
  green: 'success',
  ochre: 'warning',
  red: 'danger',
}

const HEAD_LOOK_29 = { tone: 'info', emphasis: 'soft' }

export function liftTo29(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values)) continue
    const values = node.values
    if (node.type === 'text') {
      const tone = TEXT_TONES_29[String(values.color)]
      if (tone !== undefined) values.tone = tone
      delete values.color
    }
    if (node.type === 'area' && values.appearance === 'headed') {
      values.tone ??= HEAD_LOOK_29.tone
      values.emphasis = HEAD_LOOK_29.emphasis
    }
  }
}

export function liftTo30(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'datalist' || !isPlainObject(node.values)) continue
    node.values.pick = 'several'
  }
}
